import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format, formatDistanceToNow, isPast } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import StatusUpdateForm from "@/components/partner/StatusUpdateForm"
import Link from "next/link"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "outline",
  APPROVED: "default",
  SCHEDULED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

function statusLabel(s: string) {
  return s.replace(/_/g, " ")
}

export default async function PartnerOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pid?: string }>
}) {
  const { id } = await params
  const { pid } = await searchParams
  if (!pid) redirect("/partner")

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      client: true,
      partner: true,
      fromLocation: true,
      toLocation: true,
      createdBy: true,
      items: { include: { asset: true } },
      logs: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!workOrder || workOrder.partnerId !== pid) redirect(`/partner/orders?pid=${pid}`)

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/partner/orders?pid=${pid}`}
        className="mb-3 inline-block text-sm text-[#ea580c] hover:underline"
      >
        ← Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-4">
        <Badge
          variant={STATUS_VARIANT[workOrder.status] ?? "secondary"}
          className="mb-2 px-3 py-1 text-sm"
        >
          {statusLabel(workOrder.status)}
        </Badge>
        <h1 className="text-xl font-bold">{workOrder.orderNumber}</h1>
        {workOrder.jobName && <p className="text-base font-medium">{workOrder.jobName}</p>}
        <p className="text-sm text-muted-foreground">
          {workOrder.client.name}
          {workOrder.client.fmContactName && ` — ${workOrder.client.fmContactName}`}
        </p>
        {workOrder.client.fmContactPhone && (
          <p className="text-xs text-muted-foreground">{workOrder.client.fmContactPhone}</p>
        )}
      </div>

      {/* SLA Countdown */}
      {workOrder.slaCompletionDue && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-sm font-medium">SLA Completion Due</p>
            <p
              className={`text-lg font-bold ${isPast(workOrder.slaCompletionDue) ? "text-red-600" : "text-amber-600"}`}
            >
              {isPast(workOrder.slaCompletionDue)
                ? `Overdue by ${formatDistanceToNow(workOrder.slaCompletionDue)}`
                : `${formatDistanceToNow(workOrder.slaCompletionDue, { addSuffix: true })}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(workOrder.slaCompletionDue, "MMM d, yyyy h:mm a")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* NTE */}
      {workOrder.nteAmount != null && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Not-to-Exceed (NTE)</p>
            <p className="text-lg font-bold">
              ${workOrder.nteAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Locations */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-semibold">Locations</p>
          {workOrder.fromLocation && (
            <div className="mb-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">From</p>
              <p className="text-sm">{workOrder.fromLocation.name}</p>
              <p className="text-xs text-muted-foreground">
                {workOrder.fromLocation.address}, {workOrder.fromLocation.city},{" "}
                {workOrder.fromLocation.state} {workOrder.fromLocation.zip}
              </p>
              {workOrder.fromDetail && (
                <p className="text-xs text-muted-foreground">{workOrder.fromDetail}</p>
              )}
            </div>
          )}
          {workOrder.toLocation && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">To</p>
              <p className="text-sm">{workOrder.toLocation.name}</p>
              <p className="text-xs text-muted-foreground">
                {workOrder.toLocation.address}, {workOrder.toLocation.city},{" "}
                {workOrder.toLocation.state} {workOrder.toLocation.zip}
              </p>
              {workOrder.toDetail && (
                <p className="text-xs text-muted-foreground">{workOrder.toDetail}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dates */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-semibold">Dates</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Requested</p>
              <p>{format(workOrder.requestDate, "MMM d, yyyy")}</p>
            </div>
            {workOrder.scheduledDate && (
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p>{format(workOrder.scheduledDate, "MMM d, yyyy")}</p>
              </div>
            )}
            {workOrder.completedDate && (
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p>{format(workOrder.completedDate, "MMM d, yyyy")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      {(workOrder.poNumber || workOrder.costCenter || workOrder.glCode) && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-semibold">Billing</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {workOrder.poNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">PO Number</p>
                  <p>{workOrder.poNumber}</p>
                </div>
              )}
              {workOrder.costCenter && (
                <div>
                  <p className="text-xs text-muted-foreground">Cost Center</p>
                  <p>{workOrder.costCenter}</p>
                </div>
              )}
              {workOrder.glCode && (
                <div>
                  <p className="text-xs text-muted-foreground">GL Code</p>
                  <p>{workOrder.glCode}</p>
                </div>
              )}
              {workOrder.chargeBack && (
                <div>
                  <p className="text-xs text-muted-foreground">Charge Back</p>
                  <p>{workOrder.chargeBack}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {workOrder.description && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="mb-1 text-sm font-semibold">Description</p>
            <p className="whitespace-pre-wrap text-sm">{workOrder.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      {workOrder.items.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-semibold">Items ({workOrder.items.length})</p>
            <div className="flex flex-col gap-2">
              {workOrder.items.map((item) => (
                <div key={item.id} className="rounded-md border p-2 text-sm">
                  <p className="font-medium">{item.asset.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Tag: {item.asset.tagNumber} · Qty: {item.quantity}
                  </p>
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      {workOrder.logs.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-semibold">Activity</p>
            <div className="relative flex flex-col gap-0">
              {workOrder.logs.map((log, i) => (
                <div key={log.id} className="relative flex gap-3 pb-4">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ea580c]" />
                    {i < workOrder.logs.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="-mt-0.5">
                    <p className="text-sm font-medium">{log.title}</p>
                    {log.text && <p className="text-xs text-muted-foreground">{log.text}</p>}
                    <p className="text-xs text-muted-foreground">
                      {format(log.createdAt, "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Update Form */}
      <StatusUpdateForm
        workOrderId={workOrder.id}
        currentStatus={workOrder.status}
        partnerId={pid}
      />
    </div>
  )
}
