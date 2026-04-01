import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function POST(
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
    const { status, notes, photoUrl, gpsLat, gpsLng } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };

    if ((status === "APPROVED" || status === "SCHEDULED") && !existing.respondedAt) {
      updateData.respondedAt = new Date();
    }

    if (status === "IN_PROGRESS") {
      updateData.checkedInAt = new Date();
      if (gpsLat !== undefined) updateData.checkedInLat = gpsLat;
      if (gpsLng !== undefined) updateData.checkedInLng = gpsLng;
    }

    if (status === "COMPLETED") {
      updateData.completedDate = new Date();
      updateData.checkedOutAt = new Date();
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: updateData,
    });

    let logText = `Status changed from ${existing.status} to ${status}`;
    if (notes) logText += `. Notes: ${notes}`;
    if (photoUrl) logText += `. Photo: ${photoUrl}`;
    if (gpsLat && gpsLng) logText += `. GPS: ${gpsLat}, ${gpsLng}`;

    await prisma.activityLog.create({
      data: {
        workOrderId: id,
        type: "STATUS_CHANGE",
        title: `Status changed to ${status}`,
        text: logText,
      },
    });

    return NextResponse.json({ success: true, data: workOrder });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
