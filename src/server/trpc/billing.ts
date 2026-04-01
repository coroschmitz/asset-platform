import { router, publicProcedure } from "./trpc"

export const billingRouter = router({
  getWorkOrders: publicProcedure.query(async ({ ctx }) => {
    const workOrders = await ctx.prisma.workOrder.findMany({
      where: {
        status: "COMPLETED",
      },
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
