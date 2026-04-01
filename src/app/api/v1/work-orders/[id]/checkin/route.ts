import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { gpsLat, gpsLng, notes } = body

    const workOrder = await prisma.workOrder.findUnique({ where: { id } })
    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        checkedInAt: new Date(),
        checkedInLat: gpsLat ?? null,
        checkedInLng: gpsLng ?? null,
      },
    })

    if (notes) {
      await prisma.activityLog.create({
        data: {
          workOrderId: id,
          type: "COMMENT",
          title: "Check-in note",
          text: notes,
        },
      })
    }

    await prisma.activityLog.create({
      data: {
        workOrderId: id,
        type: "STATUS_CHANGE",
        title: "Checked in – status changed to IN_PROGRESS",
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Checkin error:", error)
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 })
  }
}
