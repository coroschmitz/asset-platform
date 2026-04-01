"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts"

const COLORS = ["#ea580c", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#6366f1", "#0891b2"]

export default function AnalyticsPage() {
  const stats = trpc.dashboard.getStats.useQuery()
  const byState = trpc.analytics.inventoryByState.useQuery()
  const byCategory = trpc.analytics.inventoryByCategory.useQuery()
  const valueByLoc = trpc.analytics.valueByLocation.useQuery()
  const trends = trpc.analytics.workOrderTrends.useQuery()
  const partners = trpc.analytics.partnerPerformance.useQuery()
  const utilization = trpc.analytics.utilizationReport.useQuery()

  const avgValue = stats.data ? Math.round(stats.data.totalValue / (stats.data.totalAssets || 1)) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Asset and operational insights across all locations</p>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Assets</div>
            <div className="text-2xl font-bold mt-1">{stats.data ? formatNumber(stats.data.totalAssets) : "—"}</div>
            <div className="text-[10px] text-muted-foreground">{stats.data?.stateCount || 0} states</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Portfolio Value</div>
            <div className="text-2xl font-bold mt-1">{stats.data ? formatCurrency(stats.data.totalValue) : "—"}</div>
            <div className="text-[10px] text-muted-foreground">estimated current</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Avg Asset Value</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(avgValue)}</div>
            <div className="text-[10px] text-muted-foreground">per item</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Locations</div>
            <div className="text-2xl font-bold mt-1">{stats.data?.locationCount || "—"}</div>
            <div className="text-[10px] text-muted-foreground">{stats.data?.partnerCount || 0} partners</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory by State */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Inventory by State</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byState.data || []} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="state" width={30} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [formatNumber(Number(v)), "Assets"]} />
                  <Bar dataKey="count" fill="#ea580c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Inventory by Category */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Inventory by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory.data || []} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="count" nameKey="category">
                    {(byCategory.data || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatNumber(Number(v)), "Items"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Asset Value by Location */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Asset Value by Primary Location</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueByLoc.data || []} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Value"]} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Work Order Trends */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Work Order Trends</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="created" stroke="#ea580c" strokeWidth={2} name="Created" />
                  <Line type="monotone" dataKey="completed" stroke="#059669" strokeWidth={2} name="Completed" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analytics */}
      <CostAnalytics />

      {/* Partner Performance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Partner Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">Partner</th>
              <th className="px-4 py-2">Region</th>
              <th className="px-4 py-2">Locations</th>
              <th className="px-4 py-2">Total Orders</th>
              <th className="px-4 py-2">Completed</th>
              <th className="px-4 py-2">Completion Rate</th>
              <th className="px-4 py-2">SLA Target</th>
            </tr></thead>
            <tbody>
              {partners.data?.map((p, i) => (
                <tr key={p.name} className={cn("border-b", i % 2 === 1 && "bg-muted/10")}>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2">{p.region}</td>
                  <td className="px-4 py-2">{p.locations}</td>
                  <td className="px-4 py-2">{p.totalOrders}</td>
                  <td className="px-4 py-2">{p.completedOrders}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${p.completionRate}%` }} />
                      </div>
                      <span>{p.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">{p.slaTarget}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Utilization */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Location Utilization (Top 20)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">State</th>
              <th className="px-4 py-2">Assets</th>
              <th className="px-4 py-2">Capacity</th>
              <th className="px-4 py-2">Utilization</th>
              <th className="px-4 py-2">Partner</th>
            </tr></thead>
            <tbody>
              {utilization.data?.slice(0, 20).map((loc, i) => (
                <tr key={loc.id} className={cn("border-b", i % 2 === 1 && "bg-muted/10")}>
                  <td className="px-4 py-2 font-medium">{loc.name}</td>
                  <td className="px-4 py-2">{loc.city}</td>
                  <td className="px-4 py-2">{loc.state}</td>
                  <td className="px-4 py-2">{loc.assetCount}</td>
                  <td className="px-4 py-2">{loc.capacity}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className={cn("h-full rounded-full", loc.utilization < 65 ? "bg-green-500" : loc.utilization < 85 ? "bg-yellow-500" : "bg-red-500")}
                          style={{ width: `${Math.min(loc.utilization, 100)}%` }} />
                      </div>
                      <span className={cn("text-xs", loc.utilization > 85 && "text-red-600 font-bold")}>{loc.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs">{loc.partner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Cost Analytics Component ───
const COST_BY_PARTNER = [
  { partner: "Corovan", spend: 28450, orders: 8, avgCost: 3556 },
  { partner: "Armstrong", spend: 3400, orders: 1, avgCost: 3400 },
  { partner: "Desert Moving", spend: 7125, orders: 1, avgCost: 7125 },
  { partner: "Rocky Mountain", spend: 510, orders: 1, avgCost: 510 },
  { partner: "Dodge Moving", spend: 8140, orders: 1, avgCost: 8140 },
  { partner: "Silver State", spend: 3850, orders: 1, avgCost: 3850 },
]
const COST_BY_TYPE = [
  { type: "Storage-In", spend: 9820, count: 3 },
  { type: "Storage-Out", spend: 4327, count: 2 },
  { type: "Furniture Move", spend: 12670, count: 3 },
  { type: "Office Move", spend: 11990, count: 2 },
  { type: "Reconfigure", spend: 4560, count: 1 },
  { type: "Event Setup", spend: 3675, count: 1 },
]
const MONTHLY_SPEND = [
  { month: "Nov 2025", spend: 11990, budget: 15000 },
  { month: "Dec 2025", spend: 8230, budget: 12000 },
  { month: "Jan 2026", spend: 4890, budget: 10000 },
  { month: "Feb 2026", spend: 8055, budget: 12000 },
  { month: "Mar 2026", spend: 23482, budget: 20000 },
]
const STORAGE_COST_TREND = [
  { month: "Oct 2025", monthlyCost: 24500 },
  { month: "Nov 2025", monthlyCost: 26200 },
  { month: "Dec 2025", monthlyCost: 25800 },
  { month: "Jan 2026", monthlyCost: 23100 },
  { month: "Feb 2026", monthlyCost: 21600 },
  { month: "Mar 2026", monthlyCost: 21175 },
]

function CostAnalytics() {
  const totalSpend = COST_BY_PARTNER.reduce((s, p) => s + p.spend, 0)
  const totalOrders = COST_BY_PARTNER.reduce((s, p) => s + p.orders, 0)
  const avgPerMove = Math.round(totalSpend / totalOrders)
  const currentStorage = STORAGE_COST_TREND[STORAGE_COST_TREND.length - 1].monthlyCost

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold mb-3">Cost Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total Spend (Q1)</div>
              <div className="text-2xl font-bold mt-1">${(totalSpend / 1000).toFixed(1)}K</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Avg Cost / Move</div>
              <div className="text-2xl font-bold mt-1">${avgPerMove.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Monthly Storage Cost</div>
              <div className="text-2xl font-bold mt-1">${(currentStorage / 1000).toFixed(1)}K</div>
              <div className="text-[10px] text-green-600">-13.6% since Oct</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">NTE Overages</div>
              <div className="text-2xl font-bold text-red-600 mt-1">1</div>
              <div className="text-[10px] text-muted-foreground">$625 over on WO-0010</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Spend by Partner</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COST_BY_PARTNER} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="partner" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Spend"]} />
                  <Bar dataKey="spend" fill="#ea580c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Spend by Service Type</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COST_BY_TYPE} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Spend"]} />
                  <Bar dataKey="spend" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Spend vs. Budget</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_SPEND}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, ""]} />
                  <Bar dataKey="spend" name="Actual Spend" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" name="Budget" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Storage Cost Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={STORAGE_COST_TREND}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Monthly Cost"]} />
                  <Line type="monotone" dataKey="monthlyCost" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
