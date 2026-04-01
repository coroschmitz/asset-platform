"use client"

import { use, useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { ArrowLeft, Mail, Phone, MapPin, Star, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

interface Scorecard {
  totalOrders: number
  completedOnTime: number
  onTimeRate: number
  avgResponseHours: number
  avgCompletionHours: number
  communicationScore: number
  qualityScore: number
  overallScore: number
  cbreStarRating: number
  timeOfDelivery?: number
  levelOfCommunication?: number
  qualityOfProducts?: number
  qualityOfService?: number
  overallRecommendation?: number
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-5 w-5",
            i < Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-gray-300"
          )}
        />
      ))}
    </div>
  )
}

function ScorecardRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold">{score.toFixed(1)}/5.0</span>
    </div>
  )
}

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const partner = trpc.partners.getById.useQuery({ id })
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [scorecardLoading, setScorecardLoading] = useState(true)

  useEffect(() => {
    async function fetchScorecard() {
      try {
        const res = await fetch(`/api/v1/partners/${id}/scorecard`)
        if (res.ok) {
          const data = await res.json()
          setScorecard(data)
        }
      } catch {
        // API not yet available
      } finally {
        setScorecardLoading(false)
      }
    }
    fetchScorecard()
  }, [id])

  if (partner.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (!partner.data) return <div className="text-center py-12 text-muted-foreground">Partner not found</div>

  const p = partner.data

  // Derive monthly order volume from work orders
  const monthlyData: { month: string; orders: number }[] = []
  const monthMap = new Map<string, number>()
  for (const wo of p.workOrders) {
    const d = new Date(wo.createdAt)
    const key = format(d, "MMM yyyy")
    monthMap.set(key, (monthMap.get(key) || 0) + 1)
  }
  const sortedMonths = Array.from(monthMap.entries()).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  )
  for (const [month, orders] of sortedMonths) {
    monthlyData.push({ month, orders })
  }

  // SLA compliance (derive from work orders)
  const completed = p.workOrders.filter((wo) => wo.status === "COMPLETED")
  const slaTarget = p.slaTarget
  const met = scorecard?.completedOnTime ?? Math.round(completed.length * (slaTarget / 100))
  const breached = completed.length - met
  const atRisk = p.workOrders.filter((wo) => wo.status === "IN_PROGRESS").length

  // CBRE star categories
  const timeOfDelivery = scorecard?.timeOfDelivery ?? scorecard?.overallScore ?? 0
  const levelOfCommunication = scorecard?.levelOfCommunication ?? scorecard?.communicationScore ?? 0
  const qualityOfProducts = scorecard?.qualityOfProducts ?? scorecard?.qualityScore ?? 0
  const qualityOfService = scorecard?.qualityOfService ?? scorecard?.overallScore ?? 0
  const overallRecommendation = scorecard?.overallRecommendation ?? scorecard?.cbreStarRating ?? 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/partners">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">{p.region} &mdash; {p.states.join(", ")}</p>
        </div>
      </div>

      {/* Top Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Contact &amp; Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              {p.contactName && <div className="font-medium">{p.contactName}</div>}
              {p.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${p.contactEmail}`} className="text-primary hover:underline">{p.contactEmail}</a>
                </div>
              )}
              {p.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {p.contactPhone}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{p.states.length} states covered</span>
              </div>
              <div className="text-xs text-muted-foreground">Warehouse System</div>
              <div className="font-medium">{p.warehouseSystem}</div>
            </div>
          </CardContent>
        </Card>

        {/* CBRE Star Rating Large Display */}
        <Card className="flex flex-col items-center justify-center">
          <CardContent className="p-6 text-center">
            <div className="text-xs text-muted-foreground mb-1">CBRE Star Rating</div>
            <div className="text-5xl font-bold text-yellow-500 mb-2">
              {scorecardLoading ? "—" : (scorecard?.cbreStarRating ?? 0).toFixed(1)}
            </div>
            {!scorecardLoading && scorecard && (
              <StarRating rating={scorecard.cbreStarRating} />
            )}
            <div className="text-xs text-muted-foreground mt-1">out of 5.0</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Scorecard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance Scorecard &mdash; Q1 2026</CardTitle>
          <p className="text-xs text-muted-foreground">CBRE mySupplier 5-star format</p>
        </CardHeader>
        <CardContent>
          {scorecardLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : scorecard ? (
            <div className="max-w-md">
              <ScorecardRow label="Time of Delivery" score={timeOfDelivery} />
              <ScorecardRow label="Level of Communication" score={levelOfCommunication} />
              <ScorecardRow label="Quality of Products" score={qualityOfProducts} />
              <ScorecardRow label="Quality of Service" score={qualityOfService} />
              <ScorecardRow label="Overall Recommendation" score={overallRecommendation} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scorecard data available</p>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">On-Time Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {scorecardLoading ? "—" : `${(scorecard?.onTimeRate ?? 0).toFixed(1)}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Avg Response</span>
            </div>
            <div className="text-2xl font-bold">
              {scorecardLoading ? "—" : `${(scorecard?.avgResponseHours ?? 0).toFixed(1)}h`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Avg Completion</span>
            </div>
            <div className="text-2xl font-bold">
              {scorecardLoading ? "—" : `${(scorecard?.avgCompletionHours ?? 0).toFixed(1)}h`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Total Orders</span>
            </div>
            <div className="text-2xl font-bold">
              {scorecardLoading ? "—" : (scorecard?.totalOrders ?? p.workOrders.length)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Compliance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">SLA Compliance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-2xl font-bold text-green-700">{met}</div>
              <div className="text-xs text-green-600 font-medium">Met</div>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <div className="text-2xl font-bold text-red-700">{breached}</div>
              <div className="text-xs text-red-600 font-medium">Breached</div>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <div className="text-2xl font-bold text-yellow-700">{atRisk}</div>
              <div className="text-xs text-yellow-600 font-medium">At Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Order Volume Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Order Volume</CardTitle></CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No order history available</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Work Orders */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent Work Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Order #</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {p.workOrders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No work orders</td></tr>
              ) : (
                p.workOrders.map((wo, idx) => (
                  <tr key={wo.id} className={cn("border-b", idx % 2 === 1 && "bg-muted/10")}>
                    <td className="px-4 py-2">
                      <Link href={`/orders/${wo.id}`} className="text-primary hover:underline">{wo.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-2 text-xs">{format(new Date(wo.createdAt), "MMM d, yyyy")}</td>
                    <td className="px-4 py-2">{wo.requestType}</td>
                    <td className="px-4 py-2 text-xs">{wo.fromLocation?.city}, {wo.fromLocation?.state}</td>
                    <td className="px-4 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLORS[wo.status])}>
                        {wo.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
