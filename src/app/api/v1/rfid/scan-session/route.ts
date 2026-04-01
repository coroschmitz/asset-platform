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
    const { locationId, zone, scannedBy, tagIds } = body

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "locationId is required" },
        { status: 400 }
      )
    }

    // Get expected assets at this location with RFID tags
    const expectedAssets = await prisma.asset.findMany({
      where: {
        locationId,
        rfidTagId: { not: null },
      },
      select: {
        id: true,
        tagNumber: true,
        description: true,
        rfidTagId: true,
        rfidEpc: true,
      },
    })

    const expectedTagIds = new Set(expectedAssets.map((a) => a.rfidTagId!))
    const scannedTagIds = new Set<string>(Array.isArray(tagIds) ? tagIds : [])

    // Create TAG_READ events for each scanned tag
    if (scannedTagIds.size > 0) {
      const eventData = [...scannedTagIds].map((tagId) => {
        const asset = expectedAssets.find((a) => a.rfidTagId === tagId)
        return {
          tagId,
          assetId: asset?.id || null,
          eventType: "TAG_READ" as const,
          zone: zone || null,
          scannedBy: scannedBy || null,
        }
      })

      await prisma.rfidEvent.createMany({ data: eventData })

      // Update lastRfidScanAt for matched assets
      const matchedAssetIds = eventData
        .filter((e) => e.assetId)
        .map((e) => e.assetId!)

      if (matchedAssetIds.length > 0) {
        await prisma.asset.updateMany({
          where: { id: { in: matchedAssetIds } },
          data: {
            lastRfidScanAt: new Date(),
            lastRfidZone: zone || null,
          },
        })
      }
    }

    // Compute comparison
    const matched = [...scannedTagIds].filter((t) => expectedTagIds.has(t))
    const missing = expectedAssets.filter((a) => !scannedTagIds.has(a.rfidTagId!))
    const unexpected = [...scannedTagIds].filter((t) => !expectedTagIds.has(t))
    const accuracy =
      expectedTagIds.size > 0
        ? Math.round((matched.length / expectedTagIds.size) * 1000) / 10
        : 0

    return NextResponse.json({
      success: true,
      data: {
        expected: expectedAssets.length,
        scanned: scannedTagIds.size,
        matched: matched.length,
        missing: missing.map((a) => ({
          tagNumber: a.tagNumber,
          description: a.description,
          rfidTagId: a.rfidTagId,
        })),
        unexpected,
        accuracy,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
