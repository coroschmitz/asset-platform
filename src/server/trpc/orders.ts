import { router, publicProcedure } from "./trpc"
import { z } from "zod/v4"
import { Prisma } from "@prisma/client"

export const ordersRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        clientId: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.WorkOrderWhereInput = {}
      if (input.clientId) where.clientId = input.clientId
      if (input.status && input.status !== "ALL") {
        where.status = input.status as any
      }
      if (input.search) {
        where.OR = [
          { orderNumber: { contains: input.search, mode: "insensitive" } },
          { jobName: { contains: input.search, mode: "insensitive" } },
          { requestedBy: { contains: input.search, mode: "insensitive" } },
        ]
      }

      const orderBy: Prisma.WorkOrderOrderByWithRelationInput = input.sortBy
        ? { [input.sortBy]: input.sortDir || "desc" }
        : { createdAt: "desc" }

      const [items, total] = await Promise.all([
        ctx.prisma.workOrder.findMany({
          where,
          orderBy,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            client: { select: { name: true } },
            partner: { select: { name: true } },
            fromLocation: { select: { name: true, city: true, state: true } },
            toLocation: { select: { name: true, city: true, state: true } },
            _count: { select: { items: true } },
          },
        }),
        ctx.prisma.workOrder.count({ where }),
      ])

      return { items, total, page: input.page, pageSize: input.pageSize, totalPages: Math.ceil(total / input.pageSize) }
    }),

  getStatusCounts: publicProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const result = await ctx.prisma.workOrder.groupBy({
      by: ["status"],
      where: input?.clientId ? { clientId: input.clientId } : {},
      _count: { id: true },
    })
    const counts: Record<string, number> = { ALL: 0 }
    for (const r of result) {
      counts[r.status] = r._count.id
      counts.ALL += r._count.id
    }
    return counts
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.workOrder.findUnique({
      where: { id: input.id },
      include: {
        client: true,
        partner: true,
        fromLocation: { include: { facilities: true } },
        toLocation: { include: { facilities: true } },
        createdBy: { select: { name: true, email: true } },
        items: { include: { asset: { include: { photos: { where: { isPrimary: true }, take: 1 } } } } },
        logs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        attachments: { include: { uploadedBy: { select: { name: true } } } },
        notifications: true,
      },
    })
  }),

  create: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        requestType: z.string(),
        requestCategory: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        requestedBy: z.string(),
        requestedByEmail: z.string().optional(),
        onsiteContact: z.string().optional(),
        onsitePhone: z.string().optional(),
        createdById: z.string(),
        jobName: z.string().optional(),
        description: z.string().optional(),
        fromLocationId: z.string().optional(),
        toLocationId: z.string().optional(),
        fromDetail: z.string().optional(),
        toDetail: z.string().optional(),
        poNumber: z.string().optional(),
        costCenter: z.string().optional(),
        department: z.string().optional(),
        glCode: z.string().optional(),
        chargeBack: z.string().optional(),
        workOrderRef: z.string().optional(),
        scheduledDate: z.string().optional(),
        requireApproval: z.boolean().default(false),
        assetIds: z.array(z.object({ id: z.string(), quantity: z.number().default(1), notes: z.string().optional() })).optional(),
        notificationEmails: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get client for order numbering
      const client = await ctx.prisma.client.findUnique({ where: { id: input.clientId } })
      if (!client) throw new Error("Client not found")

      // Get next sequence number
      const lastOrder = await ctx.prisma.workOrder.findFirst({
        where: { clientId: input.clientId },
        orderBy: { sequenceNum: "desc" },
      })
      const seqNum = (lastOrder?.sequenceNum || 0) + 1
      const orderNumber = `${client.customerKey}-WO-${new Date().getFullYear()}-${String(seqNum).padStart(4, "0")}`

      // Auto-assign partner from location
      let partnerId: string | null = null
      if (input.fromLocationId) {
        const loc = await ctx.prisma.location.findUnique({ where: { id: input.fromLocationId } })
        partnerId = loc?.partnerId || null
      }

      const workOrder = await ctx.prisma.workOrder.create({
        data: {
          clientId: input.clientId,
          partnerId,
          orderNumber,
          sequenceNum: seqNum,
          requestType: input.requestType,
          requestCategory: input.requestCategory,
          priority: input.priority as any,
          status: input.requireApproval ? "PENDING_APPROVAL" : "DRAFT",
          requestedBy: input.requestedBy,
          requestedByEmail: input.requestedByEmail,
          onsiteContact: input.onsiteContact,
          onsitePhone: input.onsitePhone,
          createdById: input.createdById,
          jobName: input.jobName,
          description: input.description,
          fromLocationId: input.fromLocationId,
          toLocationId: input.toLocationId,
          fromDetail: input.fromDetail,
          toDetail: input.toDetail,
          poNumber: input.poNumber,
          costCenter: input.costCenter,
          department: input.department,
          glCode: input.glCode,
          chargeBack: input.chargeBack,
          workOrderRef: input.workOrderRef,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        },
      })

      // Add items
      if (input.assetIds?.length) {
        await ctx.prisma.workOrderItem.createMany({
          data: input.assetIds.map((a) => ({
            workOrderId: workOrder.id,
            assetId: a.id,
            quantity: a.quantity,
            notes: a.notes,
          })),
        })
      }

      // Add notifications
      if (input.notificationEmails?.length) {
        await ctx.prisma.notification.createMany({
          data: input.notificationEmails.map((email) => ({
            workOrderId: workOrder.id,
            email,
          })),
        })
      }

      // Activity log
      await ctx.prisma.activityLog.create({
        data: {
          workOrderId: workOrder.id,
          userId: input.createdById,
          type: "ACTIVITY",
          title: "Work order created",
          text: `${input.requestedBy} created work order ${orderNumber}`,
        },
      })

      return workOrder
    }),

  updateStatus: publicProcedure
    .input(z.object({ id: z.string(), status: z.string(), userId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.workOrder.update({
        where: { id: input.id },
        data: {
          status: input.status as any,
          completedDate: input.status === "COMPLETED" ? new Date() : undefined,
        },
      })

      await ctx.prisma.activityLog.create({
        data: {
          workOrderId: input.id,
          userId: input.userId,
          type: "STATUS_CHANGE",
          title: `Status changed to ${input.status.replace(/_/g, " ").toLowerCase()}`,
          text: `Status updated`,
        },
      })

      return updated
    }),

  addComment: publicProcedure
    .input(z.object({ workOrderId: z.string(), userId: z.string(), text: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.activityLog.create({
        data: {
          workOrderId: input.workOrderId,
          userId: input.userId,
          type: "COMMENT",
          title: "Comment added",
          text: input.text,
        },
      })
    }),
})
