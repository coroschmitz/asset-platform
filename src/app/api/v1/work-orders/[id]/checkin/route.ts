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
    const { gpsLat, gpsLng, notes, technicianName } = body;

    if (gpsLat === undefined || gpsLng === undefined) {
      return NextResponse.json(
        { success: false, error: "gpsLat and gpsLng are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 });
    }

    const now = new Date();
    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        checkedInAt: now,
        checkedInLat: gpsLat,
        checkedInLng: gpsLng,
        status: "IN_PROGRESS",
        respondedAt: existing.respondedAt || now,
      },
    });

    let logText = `Check-in at GPS: ${gpsLat}, ${gpsLng}`;
    if (technicianName) logText += `. Technician: ${technicianName}`;
    if (notes) logText += `. Notes: ${notes}`;

    await prisma.activityLog.create({
      data: {
        workOrderId: id,
        type: "ACTIVITY",
        title: "Technician checked in",
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
