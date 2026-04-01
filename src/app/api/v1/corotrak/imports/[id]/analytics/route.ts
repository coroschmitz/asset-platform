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

    const importRecord = await prisma.coroTrakImport.findUnique({
      where: { id },
      include: { moves: true },
    })

    if (!importRecord) {
      return NextResponse.json({ success: false, error: "Import not found" }, { status: 404 })
    }

    const { moves } = importRecord

    // Move flow for Sankey diagram
    const flowMap = new Map<string, number>()
    for (const m of moves) {
      const dest = m.isStorage ? "STORAGE" : m.destLocation
      const key = `${m.originLocation}→${dest}`
      flowMap.set(key, (flowMap.get(key) || 0) + 1)
    }
    const moveFlow = [...flowMap.entries()].map(([key, count]) => {
      const [from, to] = key.split("→")
      return { from, to, count }
    })

    // Floor heatmap
    const floorOriginMap = new Map<string, number>()
    const floorDestMap = new Map<string, number>()
    for (const m of moves) {
      const originKey = `${m.originLocation}-${m.originFloor}`
      const destKey = m.isStorage ? "STORAGE" : `${m.destLocation}-${m.destFloor}`
      floorOriginMap.set(originKey, (floorOriginMap.get(originKey) || 0) + 1)
      floorDestMap.set(destKey, (floorDestMap.get(destKey) || 0) + 1)
    }
    const allFloors = new Set([...floorOriginMap.keys(), ...floorDestMap.keys()])
    const floorHeatmap = [...allFloors].map((floor) => ({
      floor,
      originCount: floorOriginMap.get(floor) || 0,
      destCount: floorDestMap.get(floor) || 0,
    })).sort((a, b) => a.floor.localeCompare(b.floor))

    // Status breakdown
    const statusMap = new Map<string, number>()
    for (const m of moves) {
      statusMap.set(m.status, (statusMap.get(m.status) || 0) + 1)
    }
    const statusBreakdown = [...statusMap.entries()].map(([status, count]) => ({ status, count }))

    // Storage analysis
    const storageMoves = moves.filter((m) => m.isStorage)
    const storageByFloor = new Map<string, number>()
    for (const m of storageMoves) {
      const key = `${m.originLocation}-${m.originFloor}`
      storageByFloor.set(key, (storageByFloor.get(key) || 0) + 1)
    }
    const storageAnalysis = {
      totalToStorage: storageMoves.length,
      percentage: moves.length > 0 ? Math.round((storageMoves.length / moves.length) * 1000) / 10 : 0,
      byFloor: [...storageByFloor.entries()]
        .map(([floor, count]) => ({ floor, count }))
        .sort((a, b) => b.count - a.count),
    }

    // Timeline
    const completed = moves.filter((m) => m.status === "COMPLETED").length
    const inProgress = moves.filter((m) => m.status === "IN_PROGRESS").length
    const pending = moves.filter((m) => m.status === "PENDING").length
    const completionRate = moves.length > 0 ? completed / moves.length : 0
    const timeline = {
      completed,
      inProgress,
      pending,
      total: moves.length,
      completionPercentage: Math.round(completionRate * 1000) / 10,
    }

    return NextResponse.json({
      success: true,
      data: { moveFlow, floorHeatmap, statusBreakdown, storageAnalysis, timeline },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
