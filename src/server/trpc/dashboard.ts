import { router, publicProcedure, protectedProcedure } from "./trpc"
import { z } from "zod/v4"

export const dashboardRouter = router({
  getStats: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const clientFilter = input?.clientId ? { clientId: input.clientId } : {}
      const locationFilter = input?.clientId ? { clientId: input.clientId, isActive: true } : { isActive: true }

      const [totalAssets, totalValue, activeWorkOrders, locationCount, partnerCount, stateCount] = await Promise.all([
        ctx.prisma.asset.count({ where: clientFilter }),
        ctx.prisma.asset.aggregate({ where: clientFilter, _sum: { currentValue: true } }),
        ctx.prisma.workOrder.count({
          where: { ...clientFilter, status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "IN_PROGRESS"] } },
        }),
        ctx.prisma.location.count({ where: locationFilter }),
        ctx.prisma.partner.count({ where: { isActive: true } }),
        ctx.prisma.location.findMany({ where: locationFilter, distinct: ["state"], select: { state: true } }),
      ])

      return {
        totalAssets,
        totalValue: totalValue._sum.currentValue || 0,
        activeWorkOrders,
        locationCount,
        partnerCount,
        stateCount: stateCount.length,
      }
    }),

  getClientContext: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.clientId ? { id: input.clientId, isActive: true } : { isActive: true }
      const client = await ctx.prisma.client.findFirst({
        where,
        include: {
          org: { select: { name: true } },
        },
      })
      if (!client) return null
      return {
        name: client.name,
        fullName: client.fullName,
        fmCompany: client.fmCompany,
        fmContactName: client.fmContactName,
        fmContactEmail: client.fmContactEmail,
        acctDirector: client.acctDirector,
        orgName: client.org.name,
        createdAt: client.createdAt,
      }
    }),

  getAssetsByCondition: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.asset.groupBy({
        by: ["condition"],
        where: input?.clientId ? { clientId: input.clientId } : {},
        _count: { id: true },
      })
      return result.map((r) => ({ condition: r.condition, count: r._count.id }))
    }),

  getWorkOrderStatusSummary: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.workOrder.groupBy({
        by: ["status"],
        where: input?.clientId ? { clientId: input.clientId } : {},
        _count: { id: true },
      })
      return result.map((r) => ({ status: r.status, count: r._count.id }))
    }),

  getPartnerSummary: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { locations: true, workOrders: true } },
      },
    })
  }),

  getRecentWorkOrders: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.workOrder.findMany({
        where: input?.clientId ? { clientId: input.clientId } : {},
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true } },
          partner: { select: { name: true } },
          fromLocation: { select: { name: true, city: true, state: true } },
          toLocation: { select: { name: true, city: true, state: true } },
          _count: { select: { items: true } },
        },
      })
    }),

  getAssetsByCategory: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
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

  getLocationMapData: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = { isActive: true, lat: { not: null }, lng: { not: null } }
      if (input?.clientId) where.clientId = input.clientId

      const locations = await ctx.prisma.location.findMany({
        where,
        include: {
          partner: { select: { name: true } },
          _count: { select: { assets: true } },
        },
      })
      return locations.map((l) => ({
        id: l.id,
        name: l.name,
        city: l.city,
        state: l.state,
        lat: l.lat!,
        lng: l.lng!,
        type: l.locationType,
        partnerName: l.partner?.name || "Corovan Direct",
        assetCount: l._count.assets,
        capacity: l.capacity,
      }))
    }),

  getAssetsByStatus: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.asset.groupBy({
        by: ["status"],
        where: input?.clientId ? { clientId: input.clientId } : {},
        _count: { id: true },
      })
      return result.map((r) => ({ status: r.status, count: r._count.id }))
    }),

  getActiveClient: publicProcedure.query(async ({ ctx }) => {
    const client = await ctx.prisma.client.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    })
    return client
  }),

  getSLAAlerts: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const clientFilter = input?.clientId ? { clientId: input.clientId } : {}

      // Response SLA breached
      const responseBreached = await ctx.prisma.workOrder.findMany({
        where: {
          ...clientFilter,
          slaResponseDue: { lt: now },
          respondedAt: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        select: { id: true, orderNumber: true, jobName: true, slaResponseDue: true, priority: true },
        take: 20,
      })

      // Completion SLA breached
      const completionBreached = await ctx.prisma.workOrder.findMany({
        where: {
          ...clientFilter,
          slaCompletionDue: { lt: now },
          completedDate: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        select: { id: true, orderNumber: true, jobName: true, slaCompletionDue: true, priority: true },
        take: 20,
      })

      // Response at risk (within 2 hours)
      const responseAtRisk = await ctx.prisma.workOrder.findMany({
        where: {
          ...clientFilter,
          slaResponseDue: { gte: now, lte: twoHoursFromNow },
          respondedAt: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        select: { id: true, orderNumber: true, jobName: true, slaResponseDue: true, priority: true },
        take: 20,
      })

      // Completion at risk (within 24 hours)
      const completionAtRisk = await ctx.prisma.workOrder.findMany({
        where: {
          ...clientFilter,
          slaCompletionDue: { gte: now, lte: twentyFourHoursFromNow },
          completedDate: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        select: { id: true, orderNumber: true, jobName: true, slaCompletionDue: true, priority: true },
        take: 20,
      })

      return {
        breached: [...responseBreached.map(w => ({ ...w, type: "response" as const })), ...completionBreached.map(w => ({ ...w, type: "completion" as const }))],
        atRisk: [...responseAtRisk.map(w => ({ ...w, type: "response" as const })), ...completionAtRisk.map(w => ({ ...w, type: "completion" as const }))],
      }
    }),

  getClients: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        fullName: true,
        fmCompany: true,
        customerKey: true,
      },
      orderBy: { name: "asc" },
    })
  }),
})
