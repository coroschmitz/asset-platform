import { router, publicProcedure } from "./trpc"

export const analyticsRouter = router({
  inventoryByState: publicProcedure.query(async ({ ctx }) => {
    const locations = await ctx.prisma.location.findMany({
      select: { state: true, _count: { select: { assets: true } } },
    })
    const stateMap: Record<string, number> = {}
    for (const l of locations) {
      stateMap[l.state] = (stateMap[l.state] || 0) + l._count.assets
    }
    return Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
  }),

  inventoryByCategory: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.asset.groupBy({
      by: ["category"],
      _count: { id: true },
      _sum: { currentValue: true },
      orderBy: { _count: { id: "desc" } },
    })
    return result.map((r) => ({
      category: r.category,
      count: r._count.id,
      value: r._sum.currentValue || 0,
    }))
  }),

  valueByLocation: publicProcedure.query(async ({ ctx }) => {
    const locations = await ctx.prisma.location.findMany({
      where: { locationType: "PRIMARY" },
      include: {
        assets: { select: { currentValue: true } },
      },
    })
    return locations.map((l) => ({
      name: l.name,
      city: l.city,
      state: l.state,
      value: l.assets.reduce((sum, a) => sum + (a.currentValue || 0), 0),
      count: l.assets.length,
    }))
  }),

  workOrderTrends: publicProcedure.query(async ({ ctx }) => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const orders = await ctx.prisma.workOrder.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true, completedDate: true },
    })

    const monthMap: Record<string, { created: number; completed: number }> = {}
    for (const o of orders) {
      const month = o.createdAt.toISOString().slice(0, 7)
      if (!monthMap[month]) monthMap[month] = { created: 0, completed: 0 }
      monthMap[month].created++
      if (o.completedDate) {
        const compMonth = o.completedDate.toISOString().slice(0, 7)
        if (!monthMap[compMonth]) monthMap[compMonth] = { created: 0, completed: 0 }
        monthMap[compMonth].completed++
      }
    }

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))
  }),

  partnerPerformance: publicProcedure.query(async ({ ctx }) => {
    const partners = await ctx.prisma.partner.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { locations: true, workOrders: true } },
        workOrders: { select: { status: true } },
      },
    })

    return partners.map((p) => {
      const completed = p.workOrders.filter((w) => w.status === "COMPLETED").length
      const total = p.workOrders.length
      return {
        name: p.name,
        region: p.region,
        slaTarget: p.slaTarget,
        locations: p._count.locations,
        totalOrders: total,
        completedOrders: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })
  }),

  utilizationReport: publicProcedure.query(async ({ ctx }) => {
    const locations = await ctx.prisma.location.findMany({
      where: { isActive: true, capacity: { gt: 0 } },
      include: {
        _count: { select: { assets: true } },
        partner: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    })

    return locations
      .map((l) => ({
        id: l.id,
        name: l.name,
        city: l.city,
        state: l.state,
        type: l.locationType,
        capacity: l.capacity!,
        assetCount: l._count.assets,
        utilization: Math.round((l._count.assets / l.capacity!) * 100),
        partner: l.partner?.name || "Corovan Direct",
      }))
      .sort((a, b) => b.utilization - a.utilization)
  }),
})
