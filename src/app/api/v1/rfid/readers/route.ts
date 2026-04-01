import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const readers = await prisma.rfidReader.findMany({
      where: { isActive: true },
      include: {
        location: { select: { name: true, code: true, city: true, state: true } },
        _count: { select: { events: true } },
        events: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const data = readers.map((r) => ({
      ...r,
      lastEventAt: r.events[0]?.createdAt ?? null,
      events: undefined,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const { locationId, name, readerType, zone, ipAddress, serialNumber, antennaCount } = body

    if (!locationId || !name || !readerType) {
      return NextResponse.json(
        { success: false, error: "locationId, name, and readerType are required" },
        { status: 400 }
      )
    }

    const reader = await prisma.rfidReader.create({
      data: {
        locationId,
        name,
        readerType,
        zone: zone || null,
        ipAddress: ipAddress || null,
        serialNumber: serialNumber || null,
        antennaCount: antennaCount || 1,
        isActive: true,
        lastHeartbeat: new Date(),
      },
      include: {
        location: { select: { name: true, code: true } },
      },
    })

    return NextResponse.json({ success: true, data: reader }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
