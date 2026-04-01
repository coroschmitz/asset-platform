"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Leaf, Weight, Wind, Percent } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"

interface SustainabilityMetrics {
  itemsDiverted: number
  weightDivertedLbs: number
  co2AvoidedLbs: number
  diversionRate: number
  byMethod: { method: string; count: number }[]
  byMaterial: { material: string; count: number }[]
}

const METHOD_COLORS = ["#16a34a", "#2563eb", "#9333ea", "#d97706", "#dc2626", "#0891b2"]
const MATERIAL_COLORS = ["#059669", "#7c3aed", "#ea580c", "#2563eb", "#dc2626", "#d97706", "#6366f1", "#0891b2"]

export default function SustainabilityPage() {
  const [data, setData] = useState<SustainabilityMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/sustainability/metrics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted-foreground">Failed to load sustainability metrics.</div>
  }

  const weightTons = data.weightDivertedLbs / 2000
  const co2Tons = data.co2AvoidedLbs / 2000

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sustainability</h1>
        <p className="text-sm text-muted-foreground">Environmental impact and circular economy metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Items Diverted"
          value={formatNumber(data.itemsDiverted)}
          icon={<Leaf className="h-4 w-4" />}
          color="text-green-600 bg-green-50"
        />
        <KPICard
          title="Weight Diverted"
          value={`${weightTons.toFixed(1)} tons`}
          icon={<Weight className="h-4 w-4" />}
          color="text-blue-600 bg-blue-50"
        />
        <KPICard
          title="CO2 Avoided"
          value={`${co2Tons.toFixed(1)} tons`}
          icon={<Wind className="h-4 w-4" />}
          color="text-emerald-600 bg-emerald-50"
        />
        <KPICard
          title="Diversion Rate"
          value={`${data.diversionRate.toFixed(1)}%`}
          icon={<Percent className="h-4 w-4" />}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dispositions by Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byMethod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [formatNumber(Number(v)), "Items"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.byMethod.map((_, i) => (
                      <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dispositions by Material Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byMaterial}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="material"
                  >
                    {data.byMaterial.map((_, i) => (
                      <Cell key={i} fill={MATERIAL_COLORS[i % MATERIAL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatNumber(Number(v)), "Items"]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SB 253 Note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Note:</strong> SB 253 Scope 3 reporting due 2027. These metrics support your organization&apos;s climate disclosure requirements under California&apos;s Climate Corporate Data Accountability Act.
      </div>
    </div>
  )
}

function KPICard({ title, value, icon, color }: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className={cn("p-1.5 rounded-lg", color)}>{icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
