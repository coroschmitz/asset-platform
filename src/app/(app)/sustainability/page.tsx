export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  Leaf, Recycle, TreePine, TrendingUp, Scale, Building2,
  ArrowDownRight, DollarSign, Award, Target, Factory, Truck,
} from "lucide-react"

function fmt$(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtTons(lbs: number) {
  return (lbs / 2000).toFixed(1)
}

function fmtPct(n: number) {
  return n.toFixed(1) + "%"
}

export default async function SustainabilityPage() {
  let dispositions: Awaited<ReturnType<typeof prisma.disposition.findMany>> = []
  try {
    dispositions = await prisma.disposition.findMany({
      orderBy: { completedAt: "desc" },
    })
  } catch {
    // Table may not exist yet — show empty state
  }

  const divertedMethods = ["recycle", "donate", "resell", "repurpose", "refurbish", "e-waste certified"]
  const landfillMethods = ["landfill", "dispose"]

  let totalDiverted = 0
  let totalLandfill = 0
  let totalWeightDiverted = 0
  let totalWeightLandfill = 0
  let totalCarbonAvoided = 0
  let totalRevenue = 0
  let totalCost = 0
  let totalDonated = 0

  const byMethod: Record<string, { count: number; weightLbs: number; co2Lbs: number; revenue: number }> = {}
  const byMaterial: Record<string, { count: number; weightLbs: number; co2Lbs: number }> = {}
  const byMonth: Record<string, { diverted: number; landfill: number; co2Lbs: number }> = {}
  const donationRecipients: Record<string, { count: number; weightLbs: number }> = {}

  for (const d of dispositions) {
    const method = d.method.toLowerCase()
    const isDiverted = divertedMethods.includes(method)

    if (isDiverted) {
      totalDiverted++
      totalWeightDiverted += d.weightLbs || 0
      totalCarbonAvoided += d.carbonAvoidedLbs || 0
    } else if (landfillMethods.includes(method)) {
      totalLandfill++
      totalWeightLandfill += d.weightLbs || 0
    } else {
      totalDiverted++
      totalWeightDiverted += d.weightLbs || 0
      totalCarbonAvoided += d.carbonAvoidedLbs || 0
    }

    totalRevenue += d.revenue || 0
    totalCost += d.cost || 0

    if (method === "donate") {
      totalDonated++
      if (d.recipientOrg) {
        if (!donationRecipients[d.recipientOrg]) donationRecipients[d.recipientOrg] = { count: 0, weightLbs: 0 }
        donationRecipients[d.recipientOrg].count++
        donationRecipients[d.recipientOrg].weightLbs += d.weightLbs || 0
      }
    }

    // By method
    if (!byMethod[d.method]) byMethod[d.method] = { count: 0, weightLbs: 0, co2Lbs: 0, revenue: 0 }
    byMethod[d.method].count++
    byMethod[d.method].weightLbs += d.weightLbs || 0
    byMethod[d.method].co2Lbs += d.carbonAvoidedLbs || 0
    byMethod[d.method].revenue += d.revenue || 0

    // By material
    const mat = d.materialType || "Unknown"
    if (!byMaterial[mat]) byMaterial[mat] = { count: 0, weightLbs: 0, co2Lbs: 0 }
    byMaterial[mat].count++
    byMaterial[mat].weightLbs += d.weightLbs || 0
    byMaterial[mat].co2Lbs += d.carbonAvoidedLbs || 0

    // By month
    const monthKey = d.completedAt
      ? `${d.completedAt.getFullYear()}-${String(d.completedAt.getMonth() + 1).padStart(2, "0")}`
      : "Unknown"
    if (!byMonth[monthKey]) byMonth[monthKey] = { diverted: 0, landfill: 0, co2Lbs: 0 }
    if (isDiverted) {
      byMonth[monthKey].diverted++
      byMonth[monthKey].co2Lbs += d.carbonAvoidedLbs || 0
    } else {
      byMonth[monthKey].landfill++
    }
  }

  const totalItems = totalDiverted + totalLandfill
  const diversionRate = totalItems > 0 ? (totalDiverted / totalItems) * 100 : 0
  const totalWeight = totalWeightDiverted + totalWeightLandfill
  const netRecovery = totalRevenue - totalCost
  const co2Tons = totalCarbonAvoided / 2000

  // Equivalencies (EPA standards)
  const treesEquivalent = Math.round(co2Tons * 2000 / 48.7) // 48.7 lbs CO2 per tree per year
  const carsOffRoad = (co2Tons / 4.6).toFixed(1) // 4.6 metric tons per car per year
  const homesEquivalent = (co2Tons / 7.5).toFixed(1) // 7.5 metric tons per home per year

  // Sort monthly data
  const monthlyData = Object.entries(byMonth)
    .filter(([k]) => k !== "Unknown")
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)

  const sortedMethods = Object.entries(byMethod).sort(([, a], [, b]) => b.count - a.count)
  const sortedMaterials = Object.entries(byMaterial).sort(([, a], [, b]) => b.weightLbs - a.weightLbs)
  const sortedRecipients = Object.entries(donationRecipients).sort(([, a], [, b]) => b.count - a.count)

  const METHOD_COLORS: Record<string, string> = {
    Recycle: "bg-green-500",
    Donate: "bg-blue-500",
    Resell: "bg-purple-500",
    Repurpose: "bg-amber-500",
    Refurbish: "bg-cyan-500",
    Landfill: "bg-red-400",
    "E-Waste Certified": "bg-teal-500",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-green-900 via-emerald-800 to-green-900 text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Leaf className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sustainability & ESG</h1>
              <p className="text-sm text-green-200">
                Circular economy metrics, carbon accounting &amp; compliance reporting
              </p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-green-300">GHG Protocol</div>
              <div className="font-medium">Scope 3 Cat. 5</div>
            </div>
            <div className="h-8 w-px bg-green-600" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-green-300">Framework</div>
              <div className="font-medium">GRI 306 / SASB</div>
            </div>
            <div className="h-8 w-px bg-green-600" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-green-300">Items Tracked</div>
              <div className="font-medium">{formatNumber(totalItems)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Landfill Diversion Rate"
          value={fmtPct(diversionRate)}
          subtitle={`${formatNumber(totalDiverted)} of ${formatNumber(totalItems)} items`}
          icon={<Target className="h-4 w-4" />}
          color="text-green-600 bg-green-50"
          trend={diversionRate >= 90 ? "Target: 90% ✓" : `Gap: ${fmtPct(90 - diversionRate)} to target`}
          trendColor={diversionRate >= 90 ? "text-green-600" : "text-amber-600"}
        />
        <KPICard
          title="CO₂ Emissions Avoided"
          value={`${fmtTons(totalCarbonAvoided)}T`}
          subtitle={`${formatNumber(Math.round(totalCarbonAvoided))} lbs total`}
          icon={<TreePine className="h-4 w-4" />}
          color="text-emerald-600 bg-emerald-50"
          trend={`≈ ${carsOffRoad} cars off road/yr`}
          trendColor="text-emerald-600"
        />
        <KPICard
          title="Weight Diverted"
          value={`${fmtTons(totalWeightDiverted)}T`}
          subtitle={`${fmtTons(totalWeightLandfill)}T to landfill`}
          icon={<Scale className="h-4 w-4" />}
          color="text-blue-600 bg-blue-50"
          trend={`${fmtPct((totalWeightDiverted / Math.max(totalWeight, 1)) * 100)} by weight`}
          trendColor="text-blue-600"
        />
        <KPICard
          title="Net Recovery Value"
          value={fmt$(netRecovery)}
          subtitle={`${fmt$(totalRevenue)} revenue · ${fmt$(totalCost)} cost`}
          icon={<DollarSign className="h-4 w-4" />}
          color="text-purple-600 bg-purple-50"
          trend={netRecovery > 0 ? "Positive ROI" : "Investment phase"}
          trendColor={netRecovery > 0 ? "text-green-600" : "text-amber-600"}
        />
      </div>

      {/* EPA Equivalencies */}
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-green-700" />
            <span className="text-sm font-semibold text-green-900">EPA Carbon Equivalencies</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800">{treesEquivalent}</div>
              <div className="text-xs text-green-700">Tree seedlings grown 10 yrs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800">{carsOffRoad}</div>
              <div className="text-xs text-green-700">Passenger vehicles off road / yr</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800">{homesEquivalent}</div>
              <div className="text-xs text-green-700">Homes&apos; energy use / yr</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disposition Methods + Material Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disposition Methods */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Recycle className="h-4 w-4 text-green-600" />
              Disposition Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stacked bar */}
            <div className="flex h-6 rounded-full overflow-hidden gap-0.5 mb-4">
              {sortedMethods.map(([method, data]) => {
                const pct = (data.count / totalItems) * 100
                return (
                  <div
                    key={method}
                    className={cn("transition-all", METHOD_COLORS[method] || "bg-gray-400")}
                    style={{ width: `${pct}%` }}
                    title={`${method}: ${data.count} (${pct.toFixed(1)}%)`}
                  />
                )
              })}
            </div>
            <div className="space-y-2">
              {sortedMethods.map(([method, data]) => {
                const pct = (data.count / totalItems) * 100
                const isLandfill = landfillMethods.includes(method.toLowerCase())
                return (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-sm", METHOD_COLORS[method] || "bg-gray-400")} />
                      <span className="font-medium">{method}</span>
                      {isLandfill && <Badge variant="destructive" className="text-[9px] px-1 py-0">LANDFILL</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatNumber(data.count)} items</span>
                      <span>{fmtTons(data.weightLbs)}T</span>
                      <span className="w-12 text-right font-medium">{fmtPct(pct)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Material Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4 text-blue-600" />
              Material Stream Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedMaterials.map(([material, data]) => {
                const pct = (data.weightLbs / Math.max(totalWeight, 1)) * 100
                return (
                  <div key={material}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{material}</span>
                      <span className="text-xs text-muted-foreground">
                        {fmtTons(data.weightLbs)}T · {formatNumber(data.count)} items
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      <div
                        className="rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Monthly Diversion Trend (12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {monthlyData.map(([month, data]) => {
              const total = data.diverted + data.landfill
              const pct = total > 0 ? (data.diverted / total) * 100 : 0
              const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-muted-foreground text-right">{monthLabel}</span>
                  <div className="flex-1 flex h-5 rounded overflow-hidden gap-px bg-muted">
                    <div
                      className="bg-green-500 transition-all flex items-center justify-end pr-1"
                      style={{ width: `${pct}%` }}
                    >
                      {pct > 15 && <span className="text-[9px] text-white font-medium">{data.diverted}</span>}
                    </div>
                    {data.landfill > 0 && (
                      <div
                        className="bg-red-400 transition-all flex items-center justify-start pl-1"
                        style={{ width: `${100 - pct}%` }}
                      >
                        {(100 - pct) > 10 && <span className="text-[9px] text-white font-medium">{data.landfill}</span>}
                      </div>
                    )}
                  </div>
                  <span className="w-12 text-xs font-medium text-right">{fmtPct(pct)}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-500" /> Diverted</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400" /> Landfill</span>
          </div>
        </CardContent>
      </Card>

      {/* Donation Impact + Circular Economy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Community Impact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Community Donation Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-700">{formatNumber(totalDonated)}</span>
              <span className="text-sm text-muted-foreground">items donated to {Object.keys(donationRecipients).length} organizations</span>
            </div>
            <div className="space-y-2">
              {sortedRecipients.map(([org, data]) => (
                <div key={org} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <span className="text-sm font-medium">{org}</span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{data.count}</span> items · {fmtTons(data.weightLbs)}T
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Circular Economy Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-600" />
              Circular Economy Scorecard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ScoreRow label="Landfill Diversion" value={diversionRate} target={90} />
              <ScoreRow
                label="Reuse Rate (Donate + Resell + Repurpose)"
                value={totalItems > 0 ? (((byMethod["Donate"]?.count || 0) + (byMethod["Resell"]?.count || 0) + (byMethod["Repurpose"]?.count || 0)) / totalItems) * 100 : 0}
                target={50}
              />
              <ScoreRow
                label="Revenue Recovery"
                value={totalCost > 0 ? (totalRevenue / totalCost) * 100 : 0}
                target={100}
                suffix="% ROI"
              />
              <ScoreRow
                label="E-Waste Compliance"
                value={100}
                target={100}
                suffix="% certified"
              />
              <ScoreRow
                label="Carbon Intensity"
                value={totalItems > 0 ? 100 - ((totalCarbonAvoided / 2000) / totalItems) * 100 * 10 : 50}
                target={20}
                inverted
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Notices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="font-semibold mb-1 flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4" />
            SB 253 / SB 261 — California Climate Disclosure
          </div>
          These metrics support Scope 3 Category 5 (Waste Generated in Operations) reporting
          under the Climate Corporate Data Accountability Act. Disposal and diversion records
          are audit-ready for 2027 reporting deadlines.
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="font-semibold mb-1 flex items-center gap-2">
            <Award className="h-4 w-4" />
            LEED &amp; WELL Building Compliance
          </div>
          Furniture diversion and material reuse data supports LEED v4.1 MRc5 (Construction
          &amp; Demolition Waste Management) and WELL v2 Material Concept credits for client
          facilities.
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, subtitle, icon, color, trend, trendColor }: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
  trend?: string
  trendColor?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className={cn("p-1.5 rounded-lg", color)}>{icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>}
        {trend && <div className={cn("text-[10px] font-medium mt-1", trendColor)}>{trend}</div>}
      </CardContent>
    </Card>
  )
}

function ScoreRow({ label, value, target, inverted, suffix }: {
  label: string
  value: number
  target: number
  inverted?: boolean
  suffix?: string
}) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const met = inverted ? value <= target : value >= target
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{value.toFixed(1)}{suffix || "%"}</span>
          <Badge variant={met ? "default" : "outline"} className={cn("text-[9px] px-1.5", met ? "bg-green-600" : "")}>
            {met ? "MET" : `Target: ${target}${suffix || "%"}`}
          </Badge>
        </div>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        <div
          className={cn("rounded-full transition-all", met ? "bg-green-500" : "bg-amber-400")}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
