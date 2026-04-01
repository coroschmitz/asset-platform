"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { AlertTriangle, Download } from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

interface DormantAsset {
  id: string
  tagNumber: string
  description: string
  clientName: string
  locationName: string
  state: string
  monthsDormant: number
  monthlyStorageCost: number
  condition: string
  dispositionRec: string
  estimatedResaleValue: number
}

interface DormantData {
  summary: {
    totalDormant: number
    totalMonthlyCost: number
    totalEstimatedRecovery: number
  }
  dispositionBreakdown: { name: string; value: number }[]
  byState: { state: string; count: number }[]
  assets: DormantAsset[]
}

const DISPOSITION_COLORS: Record<string, string> = {
  REDEPLOY: "#16a34a",
  LIQUIDATE: "#2563eb",
  DONATE: "#9333ea",
  DISPOSE: "#dc2626",
  KEEP: "#6b7280",
}

const CONDITION_BADGE: Record<string, string> = {
  EXCELLENT: "bg-emerald-100 text-emerald-700",
  GOOD: "bg-blue-100 text-blue-700",
  FAIR: "bg-yellow-100 text-yellow-700",
  POOR: "bg-orange-100 text-orange-700",
  DAMAGED: "bg-red-100 text-red-700",
}

const REC_BADGE: Record<string, string> = {
  REDEPLOY: "bg-green-100 text-green-700",
  LIQUIDATE: "bg-blue-100 text-blue-700",
  DONATE: "bg-purple-100 text-purple-700",
  DISPOSE: "bg-red-100 text-red-700",
  KEEP: "bg-gray-100 text-gray-700",
}

export default function LifecyclePage() {
  const [data, setData] = useState<DormantData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/analytics/dormant-assets")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const exportCSV = () => {
    if (!data) return
    const headers = ["Tag#", "Description", "Client", "Location", "State", "Months Dormant", "Monthly Cost", "Condition", "Recommendation", "Est. Resale Value"]
    const rows = data.assets.slice(0, 50).map((a) => [
      a.tagNumber, a.description, a.clientName, a.locationName, a.state,
      a.monthsDormant, a.monthlyStorageCost, a.condition, a.dispositionRec, a.estimatedResaleValue,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "dormant-assets-report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted-foreground">Failed to load dormant asset data.</div>
  }

  const { summary, dispositionBreakdown, byState, assets } = data
  const top50 = assets.slice(0, 50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Lifecycle Analysis</h1>
          <p className="text-sm text-muted-foreground">Dormant asset identification and disposition recommendations</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Headline Alert Card */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-lg font-semibold text-amber-800">
              {formatNumber(summary.totalDormant)} dormant assets costing {formatCurrency(summary.totalMonthlyCost)}/month &mdash; {formatCurrency(summary.totalEstimatedRecovery)} estimated recovery
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disposition Breakdown Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Disposition Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dispositionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {dispositionBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={DISPOSITION_COLORS[entry.name] || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatNumber(Number(v)), "Assets"]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dormant by State Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dormant Assets by State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byState} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="state" width={30} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [formatNumber(Number(v)), "Assets"]} />
                  <Bar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 50 Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 50 Dormant Assets by Storage Cost</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Tag#</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Months Dormant</th>
                  <th className="px-4 py-2">Monthly Cost</th>
                  <th className="px-4 py-2">Condition</th>
                  <th className="px-4 py-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {top50.map((asset, i) => (
                  <tr key={asset.id} className={cn("border-b", i % 2 === 1 && "bg-muted/10")}>
                    <td className="px-4 py-2 font-medium">{asset.tagNumber}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate">{asset.description}</td>
                    <td className="px-4 py-2">{asset.clientName}</td>
                    <td className="px-4 py-2 text-xs">{asset.locationName}, {asset.state}</td>
                    <td className="px-4 py-2">{asset.monthsDormant}</td>
                    <td className="px-4 py-2">{formatCurrency(asset.monthlyStorageCost)}</td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", CONDITION_BADGE[asset.condition] || "bg-gray-100 text-gray-700")}>
                        {asset.condition}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", REC_BADGE[asset.dispositionRec] || "bg-gray-100 text-gray-700")}>
                        {asset.dispositionRec}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
