import { router, publicProcedure } from "./trpc"
import { z } from "zod/v4"

const clientIdInput = z.object({ clientId: z.string().optional() }).optional()

export const analyticsRouter = router({
  inventoryByState: publicProcedure
    .input(clientIdInput)
    .query(async ({ ctx, input }) => {
      const locWhere: any = {}
      if (input?.clientId) locWhere.clientId = input.clientId

      const locations = await ctx.prisma.location.findMany({
        where: locWhere,
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

  inventoryByCategory: publicProcedure
    .input(clientIdInput)
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.asset.groupBy({
        by: ["category"],
        where: input?.clientId ? { clientId: input.clientId } : {},
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

  valueByLocation: publicProcedure
    .input(clientIdInput)
    .query(async ({ ctx, input }) => {
      const where: any = { locationType: "PRIMARY" }
      if (input?.clientId) where.clientId = input.clientId

      const locations = await ctx.prisma.location.findMany({
        where,
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

  workOrderTrends: publicProcedure
    .input(clientIdInput)
    .query(async ({ ctx, input }) => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const where: any = { createdAt: { gte: sixMonthsAgo } }
      if (input?.clientId) where.clientId = input.clientId

      const orders = await ctx.prisma.workOrder.findMany({
        where,
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

  utilizationReport: publicProcedure
    .input(clientIdInput)
    .query(async ({ ctx, input }) => {
      const where: any = { isActive: true, capacity: { gt: 0 } }
      if (input?.clientId) where.clientId = input.clientId

      const locations = await ctx.prisma.location.findMany({
        where,
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
