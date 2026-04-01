import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"
import { Prisma } from "@prisma/client"

export async function GET(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const partnerId = url.searchParams.get("partnerId")
    const clientId = url.searchParams.get("clientId")
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")))

    const where: Prisma.WorkOrderWhereInput = {}
    if (status) where.status = status as Prisma.EnumWorkOrderStatusFilter
    if (partnerId) where.partnerId = partnerId
    if (clientId) where.clientId = clientId

    const [items, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: { name: true, fmCompany: true } },
          partner: { select: { name: true, region: true } },
          fromLocation: { select: { name: true, city: true, state: true } },
          toLocation: { select: { name: true, city: true, state: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  try {
    const body = await request.json()

    // Look up client
    const client = await prisma.client.findUnique({ where: { id: body.clientId } })
    if (!client) return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })

    // Generate orderNumber if not provided
    let orderNumber = body.orderNumber as string | undefined
    let sequenceNum: number
    const lastOrder = await prisma.workOrder.findFirst({
      where: { clientId: client.id },
      orderBy: { sequenceNum: "desc" },
    })
    sequenceNum = (lastOrder?.sequenceNum || 0) + 1

    if (!orderNumber) {
      orderNumber = `${client.customerKey}-WO-${new Date().getFullYear()}-${String(sequenceNum).padStart(4, "0")}`
    }

    // Auto-assign partner
    let partnerId: string | null = body.partnerId || null
    if (!partnerId && body.fromLocationId) {
      const loc = await prisma.location.findUnique({ where: { id: body.fromLocationId } })
      partnerId = loc?.partnerId || null
    }
    if (!partnerId && body.fromLocationId) {
      const loc = await prisma.location.findUnique({ where: { id: body.fromLocationId } })
      if (loc) {
        const partner = await prisma.partner.findFirst({ where: { states: { has: loc.state } } })
        partnerId = partner?.id || null
      }
    }

    // Get system user for createdById
    const createdById = body.createdById || (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }))?.id
    if (!createdById) return NextResponse.json({ success: false, error: "No user found for createdById" }, { status: 400 })

    const workOrder = await prisma.workOrder.create({
      data: {
        clientId: client.id,
        partnerId,
        orderNumber,
        sequenceNum,
        requestType: body.requestType || "MOVE",
        requestCategory: body.requestCategory,
        priority: body.priority || "MEDIUM",
        status: body.status || "DRAFT",
        requestedBy: body.requestedBy || "API",
        requestedByEmail: body.requestedByEmail,
        onsiteContact: body.onsiteContact,
        onsitePhone: body.onsitePhone,
        createdById,
        jobName: body.jobName,
        description: body.description,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        fromDetail: body.fromDetail,
        toDetail: body.toDetail,
        poNumber: body.poNumber,
        costCenter: body.costCenter,
        department: body.department,
        glCode: body.glCode,
        chargeBack: body.chargeBack,
        workOrderRef: body.workOrderRef,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        externalId: body.externalId,
        externalSource: body.externalSource,
      },
    })

    await prisma.activityLog.create({
      data: {
        workOrderId: workOrder.id,
        type: "ACTIVITY",
        title: "Work order created",
        text: `Work order ${orderNumber} created via API`,
      },
    })

    return NextResponse.json({ success: true, data: workOrder }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}
