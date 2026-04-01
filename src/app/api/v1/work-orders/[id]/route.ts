import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        client: true,
        partner: true,
        fromLocation: true,
        toLocation: true,
        items: { include: { asset: true } },
        logs: { orderBy: { createdAt: "desc" } },
        attachments: true,
        notifications: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: workOrder });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "priority", "status", "jobName", "description", "fromDetail", "toDetail",
      "poNumber", "costCenter", "department", "glCode", "scheduledDate",
      "partnerId", "fromLocationId", "toLocationId", "onsiteContact", "onsitePhone",
      "nteAmount", "actualHours", "laborRate", "materialCost",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.status === "COMPLETED") {
      updateData.completedDate = new Date();
      updateData.checkedOutAt = new Date();
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: updateData,
    });

    if (body.status && body.status !== existing.status) {
      await prisma.activityLog.create({
        data: {
          workOrderId: id,
          type: "STATUS_CHANGE",
          title: `Status changed to ${body.status}`,
          text: `Status changed from ${existing.status} to ${body.status}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: workOrder });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
