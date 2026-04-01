import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { completionComments, hoursWorked, materialCost, gpsLat, gpsLng } = body

    const workOrder = await prisma.workOrder.findUnique({ where: { id } })
    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: "COMPLETED",
        checkedOutAt: new Date(),
        completedDate: new Date(),
        completionComments,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        materialCost: materialCost ? parseFloat(materialCost) : null,
      },
    })

    await prisma.activityLog.create({
      data: {
        workOrderId: id,
        type: "STATUS_CHANGE",
        title: "Job completed – checked out",
        text: completionComments,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json({ error: "Failed to check out" }, { status: 500 })
  }
}
