import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const { events } = body

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { success: false, error: "events array is required" },
        { status: 400 }
      )
    }

    let processed = 0
    let matched = 0
    let unmatched = 0

    for (const evt of events) {
      if (!evt.tagId || !evt.eventType) continue

      // Look up asset by tagId or epc
      let asset = await prisma.asset.findFirst({
        where: { rfidTagId: evt.tagId },
        select: { id: true, locationId: true },
      })
      if (!asset && evt.epc) {
        asset = await prisma.asset.findFirst({
          where: { rfidEpc: evt.epc },
          select: { id: true, locationId: true },
        })
      }

      // Create event record
      await prisma.rfidEvent.create({
        data: {
          readerId: evt.readerId || null,
          assetId: asset?.id || null,
          tagId: evt.tagId,
          epc: evt.epc || null,
          eventType: evt.eventType,
          zone: evt.zone || null,
          signalStrength: evt.signalStrength ?? null,
          latitude: evt.latitude ?? null,
          longitude: evt.longitude ?? null,
          scannedBy: evt.scannedBy || null,
          metadata: evt.metadata || null,
        },
      })

      if (asset) {
        // Update asset RFID tracking fields
        const updateData: Record<string, unknown> = {
          lastRfidScanAt: new Date(),
          lastRfidZone: evt.zone || null,
          lastRfidReaderId: evt.readerId || null,
        }

        await prisma.asset.update({
          where: { id: asset.id },
          data: updateData,
        })

        matched++
      } else {
        unmatched++
      }

      processed++
    }

    return NextResponse.json({
      success: true,
      data: { processed, matched, unmatched },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const url = request.nextUrl
    const readerId = url.searchParams.get("readerId") || undefined
    const assetId = url.searchParams.get("assetId") || undefined
    const zone = url.searchParams.get("zone") || undefined
    const eventType = url.searchParams.get("eventType") || undefined
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 50))

    const where: Record<string, unknown> = {}
    if (readerId) where.readerId = readerId
    if (assetId) where.assetId = assetId
    if (zone) where.zone = zone
    if (eventType) where.eventType = eventType
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      }
    }

    const [events, total] = await Promise.all([
      prisma.rfidEvent.findMany({
        where,
        include: {
          asset: { select: { id: true, tagNumber: true, description: true } },
          reader: { select: { id: true, name: true, zone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.rfidEvent.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { events, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
