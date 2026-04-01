import { prisma } from "@/lib/prisma"

/**
 * Send notifications when a work order status changes.
 * In development: logs to console.
 * In production: would call webhook URL or email service.
 */
export async function sendStatusChangeNotification(
  workOrderId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      notifications: { where: { isActive: true } },
      client: { select: { name: true } },
    },
  })

  if (!workOrder) return

  const recipients = workOrder.notifications.map((n) => n.email)

  if (recipients.length > 0) {
    if (process.env.NODE_ENV === "production" && process.env.NOTIFICATION_WEBHOOK_URL) {
      try {
        await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workOrderId: workOrder.id,
            orderNumber: workOrder.orderNumber,
            clientName: workOrder.client.name,
            oldStatus,
            newStatus,
            recipients,
          }),
        })
      } catch (error) {
        console.error("Failed to send notification webhook:", error)
      }
    } else {
      console.log(
        `[Notification] Work order ${workOrder.orderNumber} status: ${oldStatus} → ${newStatus}`,
        `Recipients: ${recipients.join(", ")}`
      )
    }
  }

  // Always create activity log
  await prisma.activityLog.create({
    data: {
      workOrderId,
      type: "STATUS_CHANGE",
      title: `Status changed to ${newStatus.replace(/_/g, " ").toLowerCase()}`,
      text: `Notification sent to ${recipients.length} recipient(s)`,
    },
  })
}
