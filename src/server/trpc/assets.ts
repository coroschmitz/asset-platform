import { router, publicProcedure } from "./trpc"
import { z } from "zod/v4"
import { Prisma } from "@prisma/client"

export const assetsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(100),
        clientId: z.string().optional(),
        search: z.string().optional(),
        locationId: z.string().optional(),
        type: z.array(z.string()).optional(),
        category: z.array(z.string()).optional(),
        status: z.array(z.string()).optional(),
        condition: z.array(z.string()).optional(),
        manufacturer: z.array(z.string()).optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.AssetWhereInput = {}
      if (input.clientId) where.clientId = input.clientId

      if (input.search) {
        where.OR = [
          { tagNumber: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
          { manufacturer: { contains: input.search, mode: "insensitive" } },
        ]
      }
      if (input.locationId) where.locationId = input.locationId
      if (input.type?.length) where.type = { in: input.type }
      if (input.category?.length) where.category = { in: input.category }
      if (input.status?.length) where.status = { in: input.status as any }
      if (input.condition?.length) where.condition = { in: input.condition as any }
      if (input.manufacturer?.length) where.manufacturer = { in: input.manufacturer }

      const orderBy: Prisma.AssetOrderByWithRelationInput = input.sortBy
        ? { [input.sortBy]: input.sortDir || "asc" }
        : { tagNumber: "asc" }

      const [items, total] = await Promise.all([
        ctx.prisma.asset.findMany({
          where,
          orderBy,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            location: { select: { name: true, city: true, state: true, partner: { select: { name: true } } } },
            photos: { where: { isPrimary: true }, take: 1 },
          },
        }),
        ctx.prisma.asset.count({ where }),
      ])

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      }
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const asset = await ctx.prisma.asset.findUnique({
      where: { id: input.id },
      include: {
        location: { include: { partner: true } },
        photos: true,
        client: { select: { name: true } },
        workOrderItems: {
          include: {
            workOrder: {
              select: { id: true, orderNumber: true, status: true, requestDate: true, requestType: true },
            },
          },
        },
        dispositions: {
          orderBy: { createdAt: "desc" },
        },
      },
    })
    if (!asset) return null

    const now = new Date()
    const refDate = asset.lastMovedDate || asset.dateReceived || asset.createdAt
    const monthsDormant = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    const totalStorageCostIncurred = monthsDormant * (asset.monthlyStorageCost || 0)

    return {
      ...asset,
      monthsDormant,
      totalStorageCostIncurred,
    }
  }),

  getFilterOptions: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const assetWhere = input?.clientId ? { clientId: input.clientId } : {}
    const locWhere: any = { isActive: true }
    if (input?.clientId) locWhere.clientId = input.clientId

    const [types, categories, statuses, conditions, manufacturers, locations] = await Promise.all([
      ctx.prisma.asset.findMany({ distinct: ["type"], where: assetWhere, select: { type: true }, orderBy: { type: "asc" } }),
      ctx.prisma.asset.findMany({ distinct: ["category"], where: assetWhere, select: { category: true }, orderBy: { category: "asc" } }),
      ctx.prisma.asset.findMany({ distinct: ["status"], where: assetWhere, select: { status: true } }),
      ctx.prisma.asset.findMany({ distinct: ["condition"], where: assetWhere, select: { condition: true } }),
      ctx.prisma.asset.findMany({
        distinct: ["manufacturer"],
        select: { manufacturer: true },
        where: { ...assetWhere, manufacturer: { not: null } },
        orderBy: { manufacturer: "asc" },
      }),
      ctx.prisma.location.findMany({
        where: locWhere,
        select: { id: true, name: true, city: true, state: true, locationType: true },
        orderBy: { name: "asc" },
      }),
    ])

    return {
      types: types.map((t) => t.type),
      categories: categories.map((c) => c.category),
      statuses: statuses.map((s) => s.status),
      conditions: conditions.map((c) => c.condition),
      manufacturers: manufacturers.map((m) => m.manufacturer!),
      locations,
    }
  }),

  create: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        locationId: z.string(),
        tagNumber: z.string(),
        description: z.string(),
        type: z.string(),
        category: z.string(),
        manufacturer: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        depth: z.number().optional(),
        primaryMaterial: z.string().optional(),
        primaryColor: z.string().optional(),
        originalCost: z.number().optional(),
        currentValue: z.number().optional(),
        quantity: z.number().default(1),
        condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"]).default("GOOD"),
        status: z.enum(["IN_STORAGE", "DEPLOYED", "AVAILABLE", "RESERVED", "IN_TRANSIT", "DECOMMISSIONED"]).default("IN_STORAGE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.asset.create({ data: input })
    }),

  updateStatus: publicProcedure
    .input(z.object({ ids: z.array(z.string()), status: z.enum(["IN_STORAGE", "DEPLOYED", "AVAILABLE", "RESERVED", "IN_TRANSIT", "DECOMMISSIONED"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.asset.updateMany({
        where: { id: { in: input.ids } },
        data: { status: input.status },
      })
    }),
})
