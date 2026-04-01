import { router, publicProcedure } from "./trpc"
import { z } from "zod/v4"

export const dashboardRouter = router({
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [totalAssets, totalValue, activeWorkOrders, locationCount, partnerCount, stateCount] = await Promise.all([
      ctx.prisma.asset.count(),
      ctx.prisma.asset.aggregate({ _sum: { currentValue: true } }),
      ctx.prisma.workOrder.count({
        where: { status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "IN_PROGRESS"] } },
      }),
      ctx.prisma.location.count({ where: { isActive: true } }),
      ctx.prisma.partner.count({ where: { isActive: true } }),
      ctx.prisma.location.findMany({ distinct: ["state"], select: { state: true } }),
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

  getClientContext: publicProcedure.query(async ({ ctx }) => {
    const client = await ctx.prisma.client.findFirst({
      where: { isActive: true },
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

  getAssetsByCondition: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.asset.groupBy({
      by: ["condition"],
      _count: { id: true },
    })
    return result.map((r) => ({ condition: r.condition, count: r._count.id }))
  }),

  getWorkOrderStatusSummary: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.workOrder.groupBy({
      by: ["status"],
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

  getRecentWorkOrders: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.workOrder.findMany({
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

  getAssetsByCategory: publicProcedure.query(async ({ ctx }) => {
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

  getLocationMapData: publicProcedure.query(async ({ ctx }) => {
    const locations = await ctx.prisma.location.findMany({
      where: { isActive: true, lat: { not: null }, lng: { not: null } },
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

  getAssetsByStatus: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.asset.groupBy({
      by: ["status"],
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
})
