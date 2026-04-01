import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    const workOrder = await prisma.workOrder.findUnique({ where: { id } })
    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = { status }
    if (status === "SCHEDULED") {
      data.respondedAt = new Date()
    }
    if (status === "COMPLETED") {
      data.completedDate = new Date()
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data,
    })

    if (notes) {
      await prisma.activityLog.create({
        data: {
          workOrderId: id,
          type: "COMMENT",
          title: "Partner note",
          text: notes,
        },
      })
    }

    await prisma.activityLog.create({
      data: {
        workOrderId: id,
        type: "STATUS_CHANGE",
        title: `Status changed to ${status}`,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Status update error:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
