import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalAssets,
      totalTagged,
      totalReaders,
      readersOnline,
      eventsLast24h,
      eventsLastWeek,
      topZones,
      staleAssets,
      untaggedHighValue,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { rfidTagId: { not: null } } }),
      prisma.rfidReader.count({ where: { isActive: true } }),
      prisma.rfidReader.count({
        where: { isActive: true, lastHeartbeat: { gte: fiveMinAgo } },
      }),
      prisma.rfidEvent.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
      prisma.rfidEvent.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.rfidEvent.groupBy({
        by: ["zone"],
        where: { zone: { not: null }, createdAt: { gte: oneWeekAgo } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.asset.findMany({
        where: {
          rfidTagId: { not: null },
          lastRfidScanAt: { lt: thirtyDaysAgo },
        },
        select: {
          id: true,
          tagNumber: true,
          description: true,
          lastRfidScanAt: true,
          location: { select: { name: true, code: true } },
        },
        orderBy: { lastRfidScanAt: "asc" },
        take: 20,
      }),
      prisma.asset.findMany({
        where: {
          rfidTagId: null,
          currentValue: { gt: 500 },
        },
        select: {
          id: true,
          tagNumber: true,
          description: true,
          currentValue: true,
          location: { select: { name: true, code: true } },
        },
        orderBy: { currentValue: "desc" },
        take: 20,
      }),
    ])

    const coveragePercent = totalAssets > 0
      ? Math.round((totalTagged / totalAssets) * 1000) / 10
      : 0

    return NextResponse.json({
      success: true,
      data: {
        coverage: { totalAssets, totalTagged, percent: coveragePercent },
        readers: { total: totalReaders, online: readersOnline },
        events: { last24h: eventsLast24h, lastWeek: eventsLastWeek },
        topZones: topZones.map((z) => ({
          zone: z.zone,
          eventCount: z._count.id,
        })),
        staleAssets,
        untaggedHighValue,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
