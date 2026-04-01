import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  try {
    const { id } = await params
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        client: true,
        partner: true,
        fromLocation: { include: { facilities: true } },
        toLocation: { include: { facilities: true } },
        createdBy: { select: { name: true, email: true } },
        items: { include: { asset: { include: { photos: { where: { isPrimary: true }, take: 1 } } } } },
        logs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        attachments: { include: { uploadedBy: { select: { name: true } } } },
        notifications: true,
      },
    })

    if (!workOrder) return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: workOrder })
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.workOrder.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null
    if (body.completedDate !== undefined) data.completedDate = body.completedDate ? new Date(body.completedDate) : null
    if (body.partnerId !== undefined) data.partnerId = body.partnerId
    if (body.description !== undefined) data.description = body.description

    if (body.status === "COMPLETED" && !body.completedDate) {
      data.completedDate = new Date()
    }

    const updated = await prisma.workOrder.update({ where: { id }, data })

    if (body.status && body.status !== existing.status) {
      await prisma.activityLog.create({
        data: {
          workOrderId: id,
          type: "STATUS_CHANGE",
          title: `Status changed to ${(body.status as string).replace(/_/g, " ").toLowerCase()}`,
          text: body.notes || "Status updated via API",
        },
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}
