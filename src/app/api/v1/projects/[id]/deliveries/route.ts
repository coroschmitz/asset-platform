import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const { id } = await params

    const deliveries = await prisma.projectDelivery.findMany({
      where: { projectId: id },
      orderBy: { expectedDate: "asc" },
    })

    const data = deliveries.map((d) => {
      let status = "EXPECTED"
      if (d.receivedDate && d.receivedCount >= d.itemCount) status = "RECEIVED"
      else if (d.receivedDate && d.receivedCount > 0) status = "PARTIAL"
      else if (!d.receivedDate && new Date(d.expectedDate) < new Date()) status = "OVERDUE"
      return { ...d, status }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.vendorName || !body.expectedDate || !body.itemCount) {
      return NextResponse.json(
        { success: false, error: "vendorName, expectedDate, and itemCount are required" },
        { status: 400 }
      )
    }

    const delivery = await prisma.projectDelivery.create({
      data: {
        projectId: id,
        vendorName: body.vendorName,
        poNumber: body.poNumber || null,
        expectedDate: new Date(body.expectedDate),
        itemCount: body.itemCount,
        stagingZone: body.stagingZone || null,
      },
    })

    return NextResponse.json({ success: true, data: delivery }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()

    if (!body.deliveryId) {
      return NextResponse.json(
        { success: false, error: "deliveryId is required" },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (body.receivedDate !== undefined) data.receivedDate = body.receivedDate ? new Date(body.receivedDate) : null
    if (body.receivedCount !== undefined) data.receivedCount = body.receivedCount
    if (body.damagedCount !== undefined) data.damagedCount = body.damagedCount
    if (body.stagingZone !== undefined) data.stagingZone = body.stagingZone
    if (body.inspectedBy !== undefined) data.inspectedBy = body.inspectedBy
    if (body.notes !== undefined) data.notes = body.notes

    const delivery = await prisma.projectDelivery.update({
      where: { id: body.deliveryId },
      data,
    })

    // Update project received items count
    const allDeliveries = await prisma.projectDelivery.findMany({
      where: { projectId },
    })
    const totalReceived = allDeliveries.reduce((sum, d) => sum + d.receivedCount, 0)

    await prisma.project.update({
      where: { id: projectId },
      data: { receivedItems: totalReceived },
    })

    return NextResponse.json({ success: true, data: delivery })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
