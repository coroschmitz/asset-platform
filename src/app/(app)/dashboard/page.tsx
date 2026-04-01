"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, ClipboardList, MapPin, Users, Building2, UserCheck, Phone, Mail, Globe, Leaf, Recycle, TreePine } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { NationalMap } from "@/components/map/NationalMap"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Link from "next/link"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200",
  PENDING_APPROVAL: "bg-yellow-400",
  APPROVED: "bg-blue-400",
  SCHEDULED: "bg-purple-400",
  IN_PROGRESS: "bg-orange-400",
  COMPLETED: "bg-green-400",
  CANCELLED: "bg-red-300",
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const CONDITION_COLORS: Record<string, string> = {
  EXCELLENT: "bg-emerald-500",
  GOOD: "bg-blue-500",
  FAIR: "bg-yellow-400",
  POOR: "bg-orange-500",
  DAMAGED: "bg-red-500",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-600 font-bold",
}

export default function DashboardPage() {
  const stats = trpc.dashboard.getStats.useQuery()
  const clientCtx = trpc.dashboard.getClientContext.useQuery()
  const recentOrders = trpc.dashboard.getRecentWorkOrders.useQuery()
  const categories = trpc.dashboard.getAssetsByCategory.useQuery()
  const mapData = trpc.dashboard.getLocationMapData.useQuery()
  const conditions = trpc.dashboard.getAssetsByCondition.useQuery()
  const woStatus = trpc.dashboard.getWorkOrderStatusSummary.useQuery()
  const partners = trpc.dashboard.getPartnerSummary.useQuery()

  const totalConditions = conditions.data?.reduce((sum, c) => sum + c.count, 0) || 1
  const totalWoStatus = woStatus.data?.reduce((sum, s) => sum + s.count, 0) || 1

  return (
    <div className="space-y-6">
      {/* Client Banner */}
      {clientCtx.data ? (
        <div className="rounded-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-2xl font-bold backdrop-blur-sm">
                {clientCtx.data.name}
              </div>
              <div>
                <h1 className="text-xl font-bold">{clientCtx.data.fullName}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Managed by {clientCtx.data.fmCompany}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {stats.data?.stateCount || 6} States
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Account Director</div>
                <div className="font-medium">{clientCtx.data.acctDirector}</div>
              </div>
              <div className="h-8 w-px bg-gray-600" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">FM Contact</div>
                <div className="font-medium">{clientCtx.data.fmContactName}</div>
              </div>
              <div className="h-8 w-px bg-gray-600" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Operator</div>
                <div className="font-medium">{clientCtx.data.orgName}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Skeleton className="h-20 w-full" />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Assets"
          value={stats.data ? formatNumber(stats.data.totalAssets) : undefined}
          subtitle={stats.data ? `across ${stats.data.stateCount} states` : undefined}
          icon={<Package className="h-4 w-4" />}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          title="Portfolio Value"
          value={stats.data ? formatCurrency(stats.data.totalValue) : undefined}
          subtitle="estimated current value"
          icon={<DollarSign className="h-4 w-4" />}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          title="Active Orders"
          value={stats.data?.activeWorkOrders?.toString()}
          subtitle="in progress"
          icon={<ClipboardList className="h-4 w-4" />}
          color="text-orange-600 bg-orange-50"
        />
        <StatCard
          title="Locations"
          value={stats.data?.locationCount?.toString()}
          subtitle="offices & branches"
          icon={<MapPin className="h-4 w-4" />}
          color="text-purple-600 bg-purple-50"
        />
        <StatCard
          title="Partners"
          value={stats.data?.partnerCount?.toString()}
          subtitle="network providers"
          icon={<Users className="h-4 w-4" />}
          color="text-primary bg-orange-50"
        />
      </div>

      {/* Sustainability Banner */}
      <Link href="/sustainability">
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white">
                  <Leaf className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-green-900">Sustainability Impact</h3>
                  <p className="text-sm text-green-700">Track diversion, carbon avoidance &amp; circular economy metrics</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-8">
                <div className="text-center">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <Recycle className="h-4 w-4" />
                    <span className="text-xl font-bold">93.3%</span>
                  </div>
                  <span className="text-[10px] text-green-700">Landfill Diversion</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <TreePine className="h-4 w-4" />
                    <span className="text-xl font-bold">22.6T</span>
                  </div>
                  <span className="text-[10px] text-green-700">CO₂ Avoided</span>
                </div>
                <span className="text-xs text-green-600 font-medium">View Dashboard →</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Asset Condition + Work Order Status bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Condition breakdown */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Asset Condition</span>
              <span className="text-xs text-muted-foreground">{formatNumber(totalConditions)} total</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"] as const).map((cond) => {
                const item = conditions.data?.find((c) => c.condition === cond)
                if (!item) return null
                const pct = (item.count / totalConditions) * 100
                return (
                  <div
                    key={cond}
                    className={cn("transition-all", CONDITION_COLORS[cond])}
                    style={{ width: `${pct}%` }}
                    title={`${cond}: ${item.count} (${Math.round(pct)}%)`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"] as const).map((cond) => {
                const item = conditions.data?.find((c) => c.condition === cond)
                return (
                  <div key={cond} className="flex items-center gap-1.5 text-[10px]">
                    <span className={cn("h-2 w-2 rounded-full", CONDITION_COLORS[cond])} />
                    <span className="text-muted-foreground">{cond}</span>
                    <span className="font-medium">{item?.count || 0}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* WO Status summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Work Order Status</span>
              <span className="text-xs text-muted-foreground">{totalWoStatus} total</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {(["COMPLETED", "IN_PROGRESS", "SCHEDULED", "APPROVED", "PENDING_APPROVAL", "DRAFT", "CANCELLED"] as const).map((status) => {
                const item = woStatus.data?.find((s) => s.status === status)
                if (!item) return null
                const pct = (item.count / totalWoStatus) * 100
                return (
                  <div
                    key={status}
                    className={cn("transition-all", STATUS_COLORS[status])}
                    style={{ width: `${pct}%` }}
                    title={`${status.replace(/_/g, " ")}: ${item.count}`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {(["COMPLETED", "IN_PROGRESS", "SCHEDULED", "APPROVED", "PENDING_APPROVAL", "DRAFT", "CANCELLED"] as const).map((status) => {
                const item = woStatus.data?.find((s) => s.status === status)
                if (!item) return null
                return (
                  <div key={status} className="flex items-center gap-1.5 text-[10px]">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_COLORS[status])} />
                    <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">National Coverage Map</CardTitle>
              <Link href="/locations" className="text-xs text-primary hover:underline">View all locations &rarr;</Link>
            </div>
          </CardHeader>
          <CardContent>
            <NationalMap locations={mapData.data || []} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assets by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryPieChart data={categories.data || []} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Partner Network Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Partner Network</CardTitle>
            <Link href="/partners" className="text-xs text-primary hover:underline">Manage partners &rarr;</Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {partners.data?.map((p) => (
              <Link key={p.id} href={`/partners/${p.id}`} className="block">
                <div className="rounded-lg border p-3 hover:shadow-md transition-shadow hover:border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      p.name.includes("Corovan") ? "bg-[#ea580c]" : "bg-[#7c3aed]"
                    )} />
                    <span className="font-semibold text-xs truncate">{p.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{p.region}</div>
                  <div className="flex gap-1 mt-1.5">
                    {p.states.map((s) => (
                      <span key={s} className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>{p._count.locations} loc.</span>
                    <span>{p._count.workOrders} WOs</span>
                    <span className="text-emerald-600">{p.slaTarget}% SLA</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Work Orders */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Work Orders</CardTitle>
            <Link href="/orders" className="text-xs text-primary hover:underline">View all &rarr;</Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 pr-4 font-medium">Order #</th>
                    <th className="pb-2 pr-4 font-medium">Job Name</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">From / To</th>
                    <th className="pb-2 pr-4 font-medium">Partner</th>
                    <th className="pb-2 pr-4 font-medium">Priority</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.data?.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-4">
                        <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-xs max-w-[150px] truncate">{order.jobName || "—"}</td>
                      <td className="py-2.5 pr-4 text-xs">{order.requestType}</td>
                      <td className="py-2.5 pr-4 text-xs">
                        {order.fromLocation?.city}, {order.fromLocation?.state}
                        {order.toLocation && order.toLocationId !== order.fromLocationId && (
                          <> &rarr; {order.toLocation.city}, {order.toLocation.state}</>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">{order.partner?.name || "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span className={PRIORITY_COLORS[order.priority] || ""}>{order.priority}</span>
                      </td>
                      <td className="py-2.5">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_TEXT_COLORS[order.status] || "")}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string
  value?: string
  subtitle?: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className={cn("p-1.5 rounded-lg", color || "text-muted-foreground bg-muted")}>{icon}</span>
        </div>
        {value ? (
          <>
            <div className="mt-2 text-2xl font-bold">{value}</div>
            {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>}
          </>
        ) : (
          <Skeleton className="mt-2 h-8 w-24" />
        )}
      </CardContent>
    </Card>
  )
}
