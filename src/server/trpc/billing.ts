import { router, publicProcedure } from "./trpc"
import { z } from "zod/v4"

export const billingRouter = router({
  getWorkOrders: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const where: any = { status: "COMPLETED" }
    if (input?.clientId) where.clientId = input.clientId

    const workOrders = await ctx.prisma.workOrder.findMany({
      where,
      include: {
        client: { select: { name: true } },
        partner: { select: { name: true } },
      },
      orderBy: { completedDate: "desc" },
    })

    return workOrders.map((wo) => ({
      id: wo.id,
      orderNumber: wo.orderNumber,
      clientName: wo.client.name,
      jobName: wo.jobName,
      partnerName: wo.partner?.name ?? null,
      completedDate: wo.completedDate,
      actualHours: wo.actualHours,
      laborRate: wo.laborRate,
      materialCost: wo.materialCost,
      totalCost: wo.totalCost,
      nteAmount: wo.nteAmount,
      invoiceNumber: wo.invoiceNumber,
      invoicedAt: wo.invoicedAt,
    }))
  }),
})
