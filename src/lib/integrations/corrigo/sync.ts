import { prisma } from "@/lib/prisma";
import { CorrigoClient } from "./client";
import { corrigoMapper } from "@/lib/fm-mappers";
import { calculateSLADates } from "@/lib/sla-engine";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Map platform status to Corrigo status IDs
const STATUS_TO_CORRIGO: Record<string, number> = {
  APPROVED: 10,       // Open/Accepted
  SCHEDULED: 15,      // Scheduled
  IN_PROGRESS: 20,    // In Progress
  COMPLETED: 40,      // Completed
  CANCELLED: 50,      // Cancelled
};

// Map Corrigo status IDs to platform status
const CORRIGO_TO_STATUS: Record<number, string> = {
  5: "PENDING_APPROVAL",  // New
  10: "APPROVED",         // Open
  15: "SCHEDULED",        // Scheduled
  20: "IN_PROGRESS",      // In Progress
  30: "IN_PROGRESS",      // On Hold → keep in progress
  40: "COMPLETED",        // Completed
  50: "CANCELLED",        // Cancelled
};

async function applyFieldMappings(
  clientId: string,
  corrigoData: Record<string, any>,
  direction: "inbound" | "outbound"
): Promise<Record<string, any>> {
  const config = await prisma.corrigoConfig.findUnique({
    where: { clientId },
    include: { fieldMappings: true },
  });

  if (!config?.fieldMappings.length) return corrigoData;

  const result = { ...corrigoData };

  for (const mapping of config.fieldMappings) {
    if (
      mapping.direction !== "both" &&
      ((direction === "inbound" && mapping.direction !== "inbound") ||
        (direction === "outbound" && mapping.direction !== "outbound"))
    ) {
      continue;
    }

    if (direction === "inbound" && corrigoData[mapping.corrigoField] !== undefined) {
      result[mapping.platformField] = corrigoData[mapping.corrigoField];
    } else if (direction === "outbound" && corrigoData[mapping.platformField] !== undefined) {
      result[mapping.corrigoField] = corrigoData[mapping.platformField];
    }
  }

  return result;
}

export async function syncWorkOrderToCorrigo(workOrderId: string): Promise<void> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { client: true },
  });

  if (!workOrder) {
    throw new Error(`Work order ${workOrderId} not found`);
  }

  if (!workOrder.externalId || workOrder.externalSource !== "corrigo") {
    throw new Error(`Work order ${workOrderId} is not linked to Corrigo`);
  }

  const client = new CorrigoClient(
    await getCorrigoConfig(workOrder.clientId)
  );

  const corrigoStatusId = STATUS_TO_CORRIGO[workOrder.status];
  if (!corrigoStatusId) {
    throw new Error(`Cannot map platform status ${workOrder.status} to Corrigo`);
  }

  await client.updateWorkOrderStatus(
    parseInt(workOrder.externalId, 10),
    corrigoStatusId,
    `Status updated from platform: ${workOrder.status}`
  );

  await prisma.activityLog.create({
    data: {
      workOrderId: workOrder.id,
      type: "STATUS_CHANGE",
      title: "Status synced to Corrigo",
      text: `Platform status ${workOrder.status} synced to Corrigo status ID ${corrigoStatusId}`,
    },
  });
}

export async function syncCorrigoToWorkOrder(
  corrigoPayload: any,
  clientId: string
): Promise<string> {
  const mapped = corrigoMapper(corrigoPayload);
  const hints = mapped._locationHints;

  // Apply custom field mappings
  const wo = corrigoPayload.WorkOrder || corrigoPayload;
  const customMapped = await applyFieldMappings(clientId, wo, "inbound");

  // Check if work order already exists
  const existing = await prisma.workOrder.findFirst({
    where: {
      externalId: mapped.externalId,
      externalSource: "corrigo",
      clientId,
    },
  });

  if (existing) {
    // Update existing work order
    const corrigoStatus = CORRIGO_TO_STATUS[wo.StatusId];
    const updateData: Record<string, any> = {
      description: mapped.description || existing.description,
      nteAmount: mapped.nteAmount ?? existing.nteAmount,
      scheduledDate: mapped.scheduledDate ?? existing.scheduledDate,
    };

    if (corrigoStatus && corrigoStatus !== existing.status) {
      updateData.status = corrigoStatus;
      if (corrigoStatus === "COMPLETED") {
        updateData.completedDate = new Date();
      }
    }

    // Apply any custom field mapping overrides
    if (customMapped.poNumber) updateData.poNumber = customMapped.poNumber;
    if (customMapped.costCenter) updateData.costCenter = customMapped.costCenter;

    await prisma.workOrder.update({
      where: { id: existing.id },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        workOrderId: existing.id,
        type: "ACTIVITY",
        title: "Work order updated from Corrigo",
        text: `Synced from Corrigo. External ID: ${mapped.externalId}`,
      },
    });

    return existing.id;
  }

  // Create new work order
  let location = null;
  if (hints.city && hints.state) {
    location = await prisma.location.findFirst({
      where: {
        clientId,
        city: { equals: hints.city, mode: "insensitive" },
        state: { equals: hints.state, mode: "insensitive" },
      },
    });
  }

  let partnerId: string | undefined;
  const stateToMatch = hints.state || location?.state;
  if (stateToMatch) {
    const partner = await prisma.partner.findFirst({
      where: { states: { has: stateToMatch }, isActive: true },
    });
    if (partner) partnerId = partner.id;
  }

  const lastWo = await prisma.workOrder.findFirst({
    orderBy: { sequenceNum: "desc" },
    select: { sequenceNum: true },
  });
  const seq = (lastWo?.sequenceNum || 0) + 1;

  const sla = calculateSLADates(mapped.priority, new Date());

  const createdBy = await prisma.user.findFirst({ select: { id: true } });
  if (!createdBy) throw new Error("No user found for work order creation");

  const workOrder = await prisma.workOrder.create({
    data: {
      orderNumber: mapped.orderNumber,
      sequenceNum: seq,
      clientId,
      partnerId,
      fromLocationId: location?.id,
      requestType: "FM_WORK_ORDER",
      priority: mapped.priority,
      status: "APPROVED",
      requestedBy: "Corrigo Webhook",
      createdById: createdBy.id,
      jobName: mapped.description?.slice(0, 100),
      description: mapped.description,
      fromDetail: mapped.fromDetail,
      externalId: mapped.externalId,
      externalSource: mapped.externalSource,
      poNumber: mapped.poNumber,
      costCenter: mapped.costCenter,
      nteAmount: mapped.nteAmount,
      scheduledDate: mapped.scheduledDate,
      slaResponseDue: sla.slaResponseDue,
      slaCompletionDue: mapped.slaCompletionDue || sla.slaCompletionDue,
    },
  });

  await prisma.activityLog.create({
    data: {
      workOrderId: workOrder.id,
      type: "ACTIVITY",
      title: "Work order created from Corrigo",
      text: `External ID: ${mapped.externalId}`,
    },
  });

  return workOrder.id;
}

export async function submitInvoiceToCorrigo(workOrderId: string): Promise<void> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
  });

  if (!workOrder) {
    throw new Error(`Work order ${workOrderId} not found`);
  }

  if (!workOrder.externalId || workOrder.externalSource !== "corrigo") {
    throw new Error(`Work order ${workOrderId} is not linked to Corrigo`);
  }

  if (!workOrder.invoiceNumber) {
    throw new Error(`Work order ${workOrderId} has no invoice number`);
  }

  const client = new CorrigoClient(
    await getCorrigoConfig(workOrder.clientId)
  );

  const laborCost = (workOrder.actualHours || workOrder.hoursWorked || 0) *
    (workOrder.laborRate || 85);
  const materialCost = workOrder.materialCost || 0;
  const totalAmount = workOrder.totalCost || laborCost + materialCost;

  const result = await client.submitInvoice({
    WorkOrderId: parseInt(workOrder.externalId, 10),
    InvoiceNumber: workOrder.invoiceNumber,
    Amount: totalAmount,
    LaborCost: laborCost,
    MaterialCost: materialCost,
    Description: `Invoice for WO ${workOrder.orderNumber}`,
  });

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { invoicedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      workOrderId: workOrder.id,
      type: "ACTIVITY",
      title: "Invoice submitted to Corrigo",
      text: `Invoice ${workOrder.invoiceNumber} submitted. Corrigo Invoice ID: ${result.InvoiceId}`,
    },
  });
}

async function getCorrigoConfig(clientId: string) {
  const config = await prisma.corrigoConfig.findUnique({
    where: { clientId },
  });
  if (!config) {
    throw new Error(`No Corrigo configuration found for client ${clientId}`);
  }
  if (!config.isActive) {
    throw new Error(`Corrigo integration is disabled for client ${clientId}`);
  }
  return config;
}
