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
    const {
      completionComments,
      gpsLat,
      gpsLng,
      repairCategory,
      repairCode,
      customFields,
      hoursWorked,
      materialCost,
    } = body;

    if (!completionComments) {
      return NextResponse.json(
        { success: false, error: "completionComments is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 });
    }

    const laborRate = existing.laborRate || 75.0;
    const hours = hoursWorked || 0;
    const materials = materialCost || 0;
    const totalCost = hours * laborRate + materials;

    const now = new Date();
    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        checkedOutAt: now,
        completedDate: now,
        status: "COMPLETED",
        actualHours: hours,
        materialCost: materials,
        totalCost,
        ...(gpsLat !== undefined && { checkedInLng: gpsLng }),
      },
    });

    let logText = `Check-out completed. Comments: ${completionComments}`;
    if (repairCategory) logText += `. Repair Category: ${repairCategory}`;
    if (repairCode) logText += `. Repair Code: ${repairCode}`;
    if (hoursWorked) logText += `. Hours: ${hoursWorked}`;
    if (materialCost) logText += `. Materials: $${materialCost}`;
    logText += `. Total Cost: $${totalCost.toFixed(2)}`;
    if (gpsLat && gpsLng) logText += `. GPS: ${gpsLat}, ${gpsLng}`;
    if (customFields) logText += `. Custom Fields: ${JSON.stringify(customFields)}`;

    await prisma.activityLog.create({
      data: {
        workOrderId: id,
        type: "STATUS_CHANGE",
        title: "Technician checked out - Work completed",
        text: logText,
      },
    });

    if (existing.nteAmount && totalCost > existing.nteAmount) {
      await prisma.activityLog.create({
        data: {
          workOrderId: id,
          type: "ACTIVITY",
          title: "NTE Exceeded",
          text: `Total cost $${totalCost.toFixed(2)} exceeds NTE amount $${existing.nteAmount.toFixed(2)}`,
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
