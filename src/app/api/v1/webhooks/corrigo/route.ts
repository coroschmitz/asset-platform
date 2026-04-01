import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { corrigoMapper } from "@/lib/fm-mappers"

export async function POST(request: Request) {
  const body = await request.json()
  const log = await prisma.webhookLog.create({
    data: { source: "corrigo", direction: "inbound", payload: body },
  })

  try {
    const mapped = corrigoMapper(body)
    const client = await prisma.client.findFirst()
    if (!client) throw new Error("No client found")

    const lastOrder = await prisma.workOrder.findFirst({
      where: { clientId: client.id },
      orderBy: { sequenceNum: "desc" },
    })
    const seqNum = (lastOrder?.sequenceNum || 0) + 1

    // Find location by city/state
    let fromLocationId: string | null = null
    let partnerId: string | null = null
    if (mapped.locationCity && mapped.locationState) {
      const loc = await prisma.location.findFirst({
        where: { clientId: client.id, city: { equals: mapped.locationCity, mode: "insensitive" }, state: mapped.locationState },
      })
      if (loc) {
        fromLocationId = loc.id
        partnerId = loc.partnerId
      }
    }
    if (!partnerId && mapped.locationState) {
      const partner = await prisma.partner.findFirst({ where: { states: { has: mapped.locationState } } })
      partnerId = partner?.id || null
    }

    const systemUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } })

    const wo = await prisma.workOrder.create({
      data: {
        clientId: client.id,
        partnerId,
        fromLocationId,
        orderNumber: mapped.orderNumber,
        sequenceNum: seqNum,
        requestType: mapped.requestType,
        priority: mapped.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        status: "DRAFT",
        requestedBy: "Corrigo Webhook",
        createdById: systemUser!.id,
        description: mapped.description,
        fromDetail: mapped.fromDetail,
        poNumber: mapped.poNumber,
        costCenter: mapped.costCenter,
        externalId: mapped.orderNumber,
        externalSource: mapped.externalSource,
      },
    })

    await prisma.activityLog.create({
      data: { workOrderId: wo.id, type: "ACTIVITY", title: "Work order created", text: `Created from Corrigo webhook: ${mapped.orderNumber}` },
    })

    await prisma.webhookLog.update({ where: { id: log.id }, data: { status: "processed", workOrderId: wo.id } })
    return NextResponse.json({ received: true, workOrderId: wo.id }, { status: 200 })
  } catch (e) {
    await prisma.webhookLog.update({ where: { id: log.id }, data: { status: "failed", errorMsg: (e as Error).message } })
    return NextResponse.json({ received: true, error: (e as Error).message }, { status: 422 })
  }
}
