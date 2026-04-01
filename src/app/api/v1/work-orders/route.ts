import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { calculateSLADates } from "@/lib/sla-engine";

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const url = request.nextUrl;
    const status = url.searchParams.get("status") || undefined;
    const partnerId = url.searchParams.get("partnerId") || undefined;
    const clientId = url.searchParams.get("clientId") || undefined;
    const externalSource = url.searchParams.get("externalSource") || undefined;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (partnerId) where.partnerId = partnerId;
    if (clientId) where.clientId = clientId;
    if (externalSource) where.externalSource = externalSource;

    const [items, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          client: { select: { name: true, fmCompany: true } },
          partner: { select: { name: true, region: true } },
          fromLocation: { select: { name: true, city: true, state: true } },
          toLocation: { select: { name: true, city: true, state: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workOrder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const body = await request.json();

    const lastWo = await prisma.workOrder.findFirst({
      orderBy: { sequenceNum: "desc" },
      select: { sequenceNum: true },
    });
    const seq = (lastWo?.sequenceNum || 0) + 1;
    const orderNumber = body.orderNumber || `WO-${String(seq).padStart(6, "0")}`;

    let partnerId = body.partnerId || undefined;
    if (!partnerId && body.fromLocationId) {
      const location = await prisma.location.findUnique({
        where: { id: body.fromLocationId },
        select: { state: true },
      });
      if (location) {
        const partner = await prisma.partner.findFirst({
          where: { states: { has: location.state }, isActive: true },
        });
        if (partner) partnerId = partner.id;
      }
    }

    const now = new Date();
    const sla = calculateSLADates(body.priority || "MEDIUM", now);

    const workOrder = await prisma.workOrder.create({
      data: {
        orderNumber,
        sequenceNum: seq,
        clientId: body.clientId,
        partnerId,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        requestType: body.requestType || "MOVE",
        requestCategory: body.requestCategory,
        priority: body.priority || "MEDIUM",
        status: body.status || "DRAFT",
        requestedBy: body.requestedBy || "API",
        requestedByEmail: body.requestedByEmail,
        onsiteContact: body.onsiteContact,
        onsitePhone: body.onsitePhone,
        createdById: body.createdById,
        jobName: body.jobName,
        description: body.description,
        fromDetail: body.fromDetail,
        toDetail: body.toDetail,
        poNumber: body.poNumber,
        costCenter: body.costCenter,
        department: body.department,
        glCode: body.glCode,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        externalId: body.externalId,
        externalSource: body.externalSource,
        nteAmount: body.nteAmount,
        slaResponseDue: sla.slaResponseDue,
        slaCompletionDue: body.slaCompletionDue ? new Date(body.slaCompletionDue) : sla.slaCompletionDue,
      },
    });

    await prisma.activityLog.create({
      data: {
        workOrderId: workOrder.id,
        type: "ACTIVITY",
        title: "Work order created",
        text: `Work order ${orderNumber} created via API`,
      },
    });

    return NextResponse.json({ success: true, data: workOrder }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
