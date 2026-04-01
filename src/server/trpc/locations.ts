import { router, publicProcedure } from "./trpc"
import { z } from "zod/v4"

export const locationsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        type: z.string().optional(),
        search: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { isActive: true }
      if (input.clientId) where.clientId = input.clientId
      if (input.type && input.type !== "ALL") where.locationType = input.type
      if (input.state) where.state = input.state
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { city: { contains: input.search, mode: "insensitive" } },
        ]
      }

      return ctx.prisma.location.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          partner: { select: { name: true } },
          _count: { select: { assets: true } },
        },
      })
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.location.findUnique({
      where: { id: input.id },
      include: {
        partner: true,
        client: { select: { name: true } },
        facilities: true,
        _count: { select: { assets: true, workOrdersFrom: true, workOrdersTo: true } },
      },
    })
  }),

  getStates: publicProcedure.query(async ({ ctx }) => {
    const states = await ctx.prisma.location.findMany({
      distinct: ["state"],
      select: { state: true },
      orderBy: { state: "asc" },
    })
    return states.map((s) => s.state)
  }),
})
