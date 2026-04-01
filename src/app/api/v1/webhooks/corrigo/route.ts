import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncCorrigoToWorkOrder } from "@/lib/integrations/corrigo/sync";
import crypto from "crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Corrigo webhook event types
type CorrigoEventType =
  | "WorkOrderCreated"
  | "WorkOrderUpdated"
  | "WorkOrderStatusChanged"
  | "WorkOrderCompleted"
  | "WorkOrderCancelled";

const SUPPORTED_EVENTS: CorrigoEventType[] = [
  "WorkOrderCreated",
  "WorkOrderUpdated",
  "WorkOrderStatusChanged",
  "WorkOrderCompleted",
  "WorkOrderCancelled",
];

// Map Corrigo status IDs to platform status
const CORRIGO_STATUS_MAP: Record<number, string> = {
  5: "PENDING_APPROVAL",
  10: "APPROVED",
  15: "SCHEDULED",
  20: "IN_PROGRESS",
  30: "IN_PROGRESS",
  40: "COMPLETED",
  50: "CANCELLED",
};

function verifyHmacSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // Compare using timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

function extractEventType(payload: any): CorrigoEventType | null {
  // Corrigo may send event type in different locations
  const eventType =
    payload.EventType || payload.eventType || payload.event || payload.Action;
  if (eventType && SUPPORTED_EVENTS.includes(eventType as CorrigoEventType)) {
    return eventType as CorrigoEventType;
  }

  // Infer event type from status if not explicitly provided
  const wo = payload.WorkOrder || payload;
  if (wo.StatusId === 40) return "WorkOrderCompleted";
  if (wo.StatusId === 50) return "WorkOrderCancelled";

  // If there is an existing external ID, treat as update; otherwise created
  if (wo.Id && payload._isNew === false) return "WorkOrderUpdated";

  return "WorkOrderCreated";
}

async function resolveClientFromPayload(payload: any): Promise<string | null> {
  // Try to resolve client from CompanyId in payload
  const companyId = payload.CompanyId || payload.companyId;
  if (companyId) {
    const config = await prisma.corrigoConfig.findFirst({
      where: { companyId: String(companyId), isActive: true },
      select: { clientId: true },
    });
    if (config) return config.clientId;
  }

  // Fallback: find the first active client with a corrigo config
  const config = await prisma.corrigoConfig.findFirst({
    where: { isActive: true },
    select: { clientId: true },
  });
  if (config) return config.clientId;

  // Last fallback: first active client
  const client = await prisma.client.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  return client?.id || null;
}

async function applyFieldMappingsToPayload(
  clientId: string,
  payload: any
): Promise<any> {
  const config = await prisma.corrigoConfig.findUnique({
    where: { clientId },
    include: { fieldMappings: true },
  });

  if (!config?.fieldMappings.length) return payload;

  const wo = payload.WorkOrder || payload;
  const customFields = wo.CustomFields || [];

  for (const mapping of config.fieldMappings) {
    if (mapping.direction !== "both" && mapping.direction !== "inbound") {
      continue;
    }
    // Check custom fields for the corrigo field name
    const customField = customFields.find(
      (f: any) => f.Name === mapping.corrigoField
    );
    if (customField) {
      wo[mapping.platformField] = customField.Value;
    } else if (wo[mapping.corrigoField] !== undefined) {
      wo[mapping.platformField] = wo[mapping.corrigoField];
    }
  }

  return payload;
}

export async function POST(request: NextRequest) {
  let logId: string | undefined;
  try {
    // Read raw body for HMAC verification
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Create initial webhook log
    const log = await prisma.webhookLog.create({
      data: {
        source: "corrigo",
        event: "webhook_received",
        payload,
        status: "received",
      },
    });
    logId = log.id;

    // Resolve client
    const clientId = await resolveClientFromPayload(payload);
    if (!clientId) {
      throw new Error("No active client found for this webhook");
    }

    // HMAC signature verification
    const corrigoConfig = await prisma.corrigoConfig.findUnique({
      where: { clientId },
    });

    if (corrigoConfig?.webhookSecret) {
      const signature =
        request.headers.get("x-corrigo-signature") ||
        request.headers.get("x-hub-signature-256") ||
        request.headers.get("x-signature");

      if (!verifyHmacSignature(rawBody, signature, corrigoConfig.webhookSecret)) {
        await prisma.webhookLog.update({
          where: { id: logId },
          data: { status: "rejected", errorMsg: "Invalid HMAC signature" },
        });
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Determine event type
    const eventType = extractEventType(payload);
    await prisma.webhookLog.update({
      where: { id: logId },
      data: { event: eventType || "unknown" },
    });

    // Apply custom field mappings
    const mappedPayload = await applyFieldMappingsToPayload(clientId, payload);

    let workOrderId: string;

    switch (eventType) {
      case "WorkOrderCreated": {
        workOrderId = await syncCorrigoToWorkOrder(mappedPayload, clientId);
        break;
      }

      case "WorkOrderUpdated":
      case "WorkOrderStatusChanged": {
        workOrderId = await syncCorrigoToWorkOrder(mappedPayload, clientId);
        break;
      }

      case "WorkOrderCompleted": {
        // Ensure status is set to completed
        const wo = mappedPayload.WorkOrder || mappedPayload;
        if (!wo.StatusId) wo.StatusId = 40;
        workOrderId = await syncCorrigoToWorkOrder(mappedPayload, clientId);

        // Auto-update platform work order status on completion
        await prisma.workOrder.update({
          where: { id: workOrderId },
          data: {
            status: "COMPLETED",
            completedDate: new Date(),
          },
        });

        await prisma.activityLog.create({
          data: {
            workOrderId,
            type: "STATUS_CHANGE",
            title: "Work order completed via Corrigo webhook",
            text: "Corrigo reported work order as completed",
          },
        });
        break;
      }

      case "WorkOrderCancelled": {
        const woData = mappedPayload.WorkOrder || mappedPayload;
        if (!woData.StatusId) woData.StatusId = 50;
        workOrderId = await syncCorrigoToWorkOrder(mappedPayload, clientId);

        await prisma.workOrder.update({
          where: { id: workOrderId },
          data: { status: "CANCELLED" },
        });

        await prisma.activityLog.create({
          data: {
            workOrderId,
            type: "STATUS_CHANGE",
            title: "Work order cancelled via Corrigo webhook",
            text: "Corrigo reported work order as cancelled",
          },
        });
        break;
      }

      default: {
        // Treat unknown events as generic updates
        workOrderId = await syncCorrigoToWorkOrder(mappedPayload, clientId);
        break;
      }
    }

    await prisma.webhookLog.update({
      where: { id: logId },
      data: { status: "processed", workOrderId },
    });

    return NextResponse.json({
      success: true,
      data: { workOrderId, event: eventType },
    });
  } catch (error) {
    if (logId) {
      await prisma.webhookLog
        .update({
          where: { id: logId },
          data: {
            status: "failed",
            errorMsg:
              error instanceof Error ? error.message : "Unknown error",
          },
        })
        .catch(() => {});
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 422 }
    );
  }
}
