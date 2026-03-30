"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, ClipboardList, MapPin, Users } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { NationalMap } from "@/components/map/NationalMap"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"
import { Skeleton } from "@/components/ui/skeleton"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-600 font-bold",
}

export default function DashboardPage() {
  const stats = trpc.dashboard.getStats.useQuery()
  const recentOrders = trpc.dashboard.getRecentWorkOrders.useQuery()
  const categories = trpc.dashboard.getAssetsByCategory.useQuery()
  const mapData = trpc.dashboard.getLocationMapData.useQuery()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">National asset management overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Assets"
          value={stats.data ? formatNumber(stats.data.totalAssets) : undefined}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          title="Asset Value"
          value={stats.data ? formatCurrency(stats.data.totalValue) : undefined}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Active Orders"
          value={stats.data?.activeWorkOrders?.toString()}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          title="Locations"
          value={stats.data?.locationCount?.toString()}
          icon={<MapPin className="h-4 w-4" />}
        />
        <StatCard
          title="Partners"
          value={stats.data?.partnerCount?.toString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Map + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">National Coverage Map</CardTitle>
          </CardHeader>
          <CardContent>
            <NationalMap locations={mapData.data || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categories.data || []} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Work Orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Work Orders</CardTitle>
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
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Order #</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">From / To</th>
                    <th className="pb-2 pr-4 font-medium">Partner</th>
                    <th className="pb-2 pr-4 font-medium">Items</th>
                    <th className="pb-2 pr-4 font-medium">Priority</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.data?.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-4 font-medium">{order.orderNumber}</td>
                      <td className="py-2.5 pr-4">{order.requestType}</td>
                      <td className="py-2.5 pr-4 text-xs">
                        {order.fromLocation?.city}, {order.fromLocation?.state}
                        {order.toLocation && order.toLocationId !== order.fromLocationId && (
                          <> &rarr; {order.toLocation.city}, {order.toLocation.state}</>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">{order.partner?.name || "—"}</td>
                      <td className="py-2.5 pr-4">{order._count.items}</td>
                      <td className="py-2.5 pr-4">
                        <span className={PRIORITY_COLORS[order.priority] || ""}>{order.priority}</span>
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] || ""}`}>
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

function StatCard({ title, value, icon }: { title: string; value?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        {value ? (
          <div className="mt-2 text-2xl font-bold">{value}</div>
        ) : (
          <Skeleton className="mt-2 h-8 w-24" />
        )}
      </CardContent>
    </Card>
  )
}
