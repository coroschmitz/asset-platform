import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes, updatedBy } = body as {
      status: string
      notes?: string
      photoUrl?: string
      gpsLat?: number
      gpsLng?: number
      updatedBy?: string
    }

    if (!status) return NextResponse.json({ success: false, error: "status is required" }, { status: 400 })

    const existing = await prisma.workOrder.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 })

    const data: Record<string, unknown> = { status }
    if (status === "COMPLETED") data.completedDate = new Date()

    const updated = await prisma.workOrder.update({ where: { id }, data })

    const logText = notes ? `Status updated. Notes: ${notes}` : "Status updated via API"
    await prisma.activityLog.create({
      data: {
        workOrderId: id,
        userId: updatedBy || null,
        type: "STATUS_CHANGE",
        title: `Status changed to ${status.replace(/_/g, " ").toLowerCase()}`,
        text: logText,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}
