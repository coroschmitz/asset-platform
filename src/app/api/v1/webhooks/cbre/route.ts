import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cbreNexusMapper } from "@/lib/fm-mappers";
import { calculateSLADates } from "@/lib/sla-engine";

export async function POST(request: NextRequest) {
  let logId: string | undefined;
  try {
    const payload = await request.json();

    const log = await prisma.webhookLog.create({
      data: { platform: "cbre", event: "work_order", payload, status: "received" },
    });
    logId = log.id;

    const mapped = cbreNexusMapper(payload);
    const hints = mapped._locationHints;

    const client = await prisma.client.findFirst({ where: { isActive: true } });
    if (!client) throw new Error("No active client found");

    let location = null;
    if (hints.code) {
      location = await prisma.location.findFirst({
        where: { clientId: client.id, code: hints.code },
      });
    }
    if (!location && hints.name) {
      location = await prisma.location.findFirst({
        where: { clientId: client.id, name: { contains: hints.name, mode: "insensitive" } },
      });
    }

    let partnerId: string | undefined;
    if (location?.state) {
      const partner = await prisma.partner.findFirst({ where: { states: { has: location.state }, isActive: true } });
      if (partner) partnerId = partner.id;
    }

    const lastWo = await prisma.workOrder.findFirst({ orderBy: { sequenceNum: "desc" }, select: { sequenceNum: true } });
    const seq = (lastWo?.sequenceNum || 0) + 1;
    const sla = calculateSLADates(mapped.priority, new Date());

    const workOrder = await prisma.workOrder.create({
      data: {
        orderNumber: mapped.orderNumber,
        sequenceNum: seq,
        clientId: client.id,
        partnerId,
        fromLocationId: location?.id,
        requestType: "FM_WORK_ORDER",
        priority: mapped.priority,
        status: "APPROVED",
        requestedBy: "CBRE Webhook",
        createdById: (await prisma.user.findFirst({ select: { id: true } }))!.id,
        description: mapped.description,
        fromDetail: mapped.fromDetail,
        externalId: mapped.externalId,
        externalSource: mapped.externalSource,
        glCode: mapped.glCode,
        nteAmount: mapped.nteAmount,
        slaResponseDue: sla.slaResponseDue,
        slaCompletionDue: sla.slaCompletionDue,
      },
    });

    await prisma.activityLog.create({
      data: {
        workOrderId: workOrder.id,
        type: "ACTIVITY",
        title: "Work order created from CBRE webhook",
        text: `External ID: ${mapped.externalId}`,
      },
    });

    await prisma.webhookLog.update({
      where: { id: logId },
      data: { status: "processed", workOrderId: workOrder.id },
    });

    return NextResponse.json({ success: true, data: { workOrderId: workOrder.id, orderNumber: workOrder.orderNumber } });
  } catch (error) {
    if (logId) {
      await prisma.webhookLog.update({
        where: { id: logId },
        data: { status: "failed", error: error instanceof Error ? error.message : "Unknown error" },
      }).catch(() => {});
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 422 }
    );
  }
}
