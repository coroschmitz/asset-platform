import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const clientId = request.nextUrl.searchParams.get("clientId")
    const month = request.nextUrl.searchParams.get("month") // YYYY-MM

    if (!clientId || !month) {
      return NextResponse.json(
        { success: false, error: "clientId and month (YYYY-MM) are required" },
        { status: 400 }
      )
    }

    const [year, monthNum] = month.split("-").map(Number)
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 1)

    // Previous month for comparison
    const prevStart = new Date(year, monthNum - 2, 1)
    const prevEnd = new Date(year, monthNum - 1, 1)

    const clientFilter = { clientId }

    // Work orders completed this month
    const completedOrders = await prisma.workOrder.findMany({
      where: {
        ...clientFilter,
        status: "COMPLETED",
        completedDate: { gte: startDate, lt: endDate },
      },
      include: {
        partner: { select: { name: true } },
      },
    })

    // Previous month completed for comparison
    const prevCompleted = await prisma.workOrder.count({
      where: {
        ...clientFilter,
        status: "COMPLETED",
        completedDate: { gte: prevStart, lt: prevEnd },
      },
    })

    // Asset stats
    const totalAssets = await prisma.asset.count({ where: clientFilter })
    const assetsByStatus = await prisma.asset.groupBy({
      by: ["status"],
      where: clientFilter,
      _count: { id: true },
    })

    // Cost breakdown
    const totalCost = completedOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0)
    const totalLaborCost = completedOrders.reduce((sum, wo) => sum + ((wo.actualHours || 0) * (wo.laborRate || 85)), 0)
    const totalMaterialCost = completedOrders.reduce((sum, wo) => sum + (wo.materialCost || 0), 0)

    // SLA compliance
    const withSla = completedOrders.filter((wo) => wo.slaCompletionDue)
    const slaCompliant = withSla.filter((wo) => wo.completedDate && wo.slaCompletionDue && wo.completedDate <= wo.slaCompletionDue)
    const slaRate = withSla.length > 0 ? Math.round((slaCompliant.length / withSla.length) * 100) : 100

    // Partner performance
    const partnerMap = new Map<string, { name: string; completed: number; totalCost: number }>()
    for (const wo of completedOrders) {
      const pName = wo.partner?.name || "Corovan Direct"
      const existing = partnerMap.get(pName) || { name: pName, completed: 0, totalCost: 0 }
      existing.completed++
      existing.totalCost += wo.totalCost || 0
      partnerMap.set(pName, existing)
    }

    // Sustainability
    const dispositions = await prisma.disposition.findMany({
      where: {
        asset: clientFilter,
        completedAt: { gte: startDate, lt: endDate },
      },
    })
    const totalDiverted = dispositions.filter((d) => !["DISPOSED", "landfill"].includes(d.method.toLowerCase())).length
    const totalCarbonAvoided = dispositions.reduce((sum, d) => sum + (d.carbonAvoidedLbs || 0), 0)
    const diversionRate = dispositions.length > 0 ? Math.round((totalDiverted / dispositions.length) * 100) : 0

    const report = {
      period: month,
      client: clientId,
      workOrders: {
        completedCount: completedOrders.length,
        previousMonthCount: prevCompleted,
        changePercent: prevCompleted > 0 ? Math.round(((completedOrders.length - prevCompleted) / prevCompleted) * 100) : 0,
        totalCost: Math.round(totalCost * 100) / 100,
      },
      assets: {
        total: totalAssets,
        byStatus: assetsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      },
      sla: {
        complianceRate: slaRate,
        totalTracked: withSla.length,
        compliant: slaCompliant.length,
      },
      costs: {
        total: Math.round(totalCost * 100) / 100,
        labor: Math.round(totalLaborCost * 100) / 100,
        materials: Math.round(totalMaterialCost * 100) / 100,
      },
      partnerPerformance: Array.from(partnerMap.values()),
      sustainability: {
        dispositions: dispositions.length,
        diverted: totalDiverted,
        diversionRate,
        co2AvoidedLbs: Math.round(totalCarbonAvoided * 100) / 100,
      },
    }

    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
