import { router, publicProcedure } from "./trpc"
import { z } from "zod/v4"

export const partnersRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { locations: true, workOrders: true } },
      },
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const partner = await ctx.prisma.partner.findUnique({
      where: { id: input.id },
      include: {
        locations: {
          include: { _count: { select: { assets: true } } },
          orderBy: { name: "asc" },
        },
        workOrders: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            client: { select: { name: true } },
            fromLocation: { select: { name: true, city: true, state: true } },
          },
        },
      },
    })
    return partner
  }),
})
