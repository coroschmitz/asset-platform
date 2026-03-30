"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Plus, Search, ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "PENDING_APPROVAL", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
]

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-blue-400",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-600",
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const statusCounts = trpc.orders.getStatusCounts.useQuery()
  const orders = trpc.orders.list.useQuery({
    page,
    pageSize: 20,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: search || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Orders</h1>
          <p className="text-sm text-muted-foreground">Manage furniture requests and fulfillment</p>
        </div>
        <Link href="/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Work Order
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = statusCounts.data?.[tab.key] || 0
          return (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1) }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {tab.label}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                statusFilter === tab.key ? "bg-white/20" : "bg-muted"
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2 font-medium">Order #</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">From / To</th>
              <th className="px-3 py-2 font-medium">Partner</th>
              <th className="px-3 py-2 font-medium">Items</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Requested By</th>
            </tr>
          </thead>
          <tbody>
            {orders.data?.items.map((order, idx) => (
              <>
                <tr
                  key={order.id}
                  className={cn(
                    "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                    idx % 2 === 1 && "bg-muted/10"
                  )}
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <td className="px-3 py-2.5">
                    {expandedId === order.id ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {format(new Date(order.requestDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs">{order.requestType}</div>
                    {order.requestCategory && (
                      <div className="text-[10px] text-muted-foreground">{order.requestCategory}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {order.fromLocation?.city}, {order.fromLocation?.state}
                    {order.toLocation && order.toLocationId !== order.fromLocationId && (
                      <> &rarr; {order.toLocation.city}, {order.toLocation.state}</>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{order.partner?.name || "—"}</td>
                  <td className="px-3 py-2.5 text-center">{order._count.items}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[order.priority])} />
                      <span className="text-xs">{order.priority}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLORS[order.status])}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{order.requestedBy}</td>
                </tr>
                {expandedId === order.id && (
                  <tr key={`${order.id}-detail`} className="bg-muted/20">
                    <td colSpan={10} className="px-6 py-3">
                      <ExpandedOrderRow orderId={order.id} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {orders.data ? `${(page - 1) * 20 + 1} – ${Math.min(page * 20, orders.data.total)} of ${orders.data.total}` : ""}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={page >= (orders.data?.totalPages || 1)} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}

function ExpandedOrderRow({ orderId }: { orderId: string }) {
  const order = trpc.orders.getById.useQuery({ id: orderId })

  if (order.isLoading) return <div className="text-xs text-muted-foreground">Loading details...</div>
  if (!order.data) return null

  return (
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div>
        <h4 className="font-semibold mb-1">Description</h4>
        <p className="text-muted-foreground">{order.data.description || "No description"}</p>
        {order.data.jobName && (
          <p className="mt-1"><span className="font-medium">Job:</span> {order.data.jobName}</p>
        )}
        {order.data.poNumber && (
          <p><span className="font-medium">PO:</span> {order.data.poNumber}</p>
        )}
      </div>
      <div>
        <h4 className="font-semibold mb-1">Items ({order.data.items.length})</h4>
        <div className="space-y-0.5">
          {order.data.items.slice(0, 5).map((item) => (
            <div key={item.id} className="text-muted-foreground">
              {item.quantity}x {item.asset.description.slice(0, 50)}
            </div>
          ))}
          {order.data.items.length > 5 && (
            <div className="text-primary">+{order.data.items.length - 5} more</div>
          )}
        </div>
      </div>
    </div>
  )
}
