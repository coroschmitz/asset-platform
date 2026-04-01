import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format, isPast } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500",
}

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

type Tab = "active" | "pending" | "done" | "all"

const ACTIVE_STATUSES = ["APPROVED", "SCHEDULED", "IN_PROGRESS"]
const PENDING_STATUSES = ["DRAFT", "PENDING_APPROVAL"]
const DONE_STATUSES = ["COMPLETED", "CANCELLED"]

export default async function PartnerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; tab?: string }>
}) {
  const { pid, tab } = await searchParams
  if (!pid) redirect("/partner")

  const [partner, workOrders] = await Promise.all([
    prisma.partner.findUnique({ where: { id: pid } }),
    prisma.workOrder.findMany({
      where: { partnerId: pid },
      include: {
        client: true,
        fromLocation: true,
        toLocation: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  if (!partner) redirect("/partner")

  const activeCounts = workOrders.filter((wo) => ACTIVE_STATUSES.includes(wo.status)).length
  const pendingCounts = workOrders.filter((wo) => PENDING_STATUSES.includes(wo.status)).length
  const doneCounts = workOrders.filter((wo) => DONE_STATUSES.includes(wo.status)).length

  const currentTab: Tab = (tab as Tab) || "active"

  const filtered =
    currentTab === "all"
      ? workOrders
      : currentTab === "active"
        ? workOrders.filter((wo) => ACTIVE_STATUSES.includes(wo.status))
        : currentTab === "pending"
          ? workOrders.filter((wo) => PENDING_STATUSES.includes(wo.status))
          : workOrders.filter((wo) => DONE_STATUSES.includes(wo.status))

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-bold">Work Orders</h1>
      <p className="mb-4 text-sm text-muted-foreground">{partner.name}</p>

      <Tabs defaultValue={currentTab}>
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="active">
            <Link href={`/partner/orders?pid=${pid}&tab=active`} className="w-full">
              Active ({activeCounts})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Link href={`/partner/orders?pid=${pid}&tab=pending`} className="w-full">
              Pending ({pendingCounts})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="done">
            <Link href={`/partner/orders?pid=${pid}&tab=done`} className="w-full">
              Done ({doneCounts})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="all">
            <Link href={`/partner/orders?pid=${pid}&tab=all`} className="w-full">
              All ({workOrders.length})
            </Link>
          </TabsTrigger>
        </TabsList>

        {["active", "pending", "done", "all"].map((t) => (
          <TabsContent key={t} value={t}>
            <div className="flex flex-col gap-3">
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No work orders</p>
              )}
              {filtered.map((wo) => {
                const slaDue = wo.slaCompletionDue ?? wo.slaResponseDue
                const pastDue = slaDue ? isPast(slaDue) : false

                return (
                  <Link key={wo.id} href={`/partner/orders/${wo.id}?pid=${pid}`}>
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-[#ea580c]">
                              {wo.orderNumber}
                            </span>
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${PRIORITY_COLORS[wo.priority] ?? "bg-gray-400"}`}
                              title={wo.priority}
                            />
                          </div>
                          <Badge variant={STATUS_VARIANT[wo.status] ?? "secondary"}>
                            {statusLabel(wo.status)}
                          </Badge>
                        </div>
                        {wo.jobName && (
                          <p className="mb-1 text-sm font-medium">{wo.jobName}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {wo.client.name}
                          {wo.client.fmContactName && ` — ${wo.client.fmContactName}`}
                        </p>
                        {(wo.fromLocation || wo.toLocation) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {wo.fromLocation?.city ?? "—"} → {wo.toLocation?.city ?? "—"}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          {wo.scheduledDate && (
                            <span>{format(wo.scheduledDate, "MMM d, yyyy")}</span>
                          )}
                          {slaDue && (
                            <span className={pastDue ? "font-semibold text-red-600" : "text-amber-600"}>
                              Due: {format(slaDue, "MMM d")}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
