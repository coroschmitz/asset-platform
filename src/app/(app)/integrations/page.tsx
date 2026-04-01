"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface PlatformStatus {
  name: string
  subtitle: string
  status: "connected" | "ready"
  workOrdersReceived: number
  lastActivity: string
  successRate: number
  color: string
}

interface WebhookLog {
  id: string
  time: string
  platform: string
  direction: "inbound" | "outbound"
  status: "success" | "error" | "pending"
  workOrderId?: string
  workOrderNumber?: string
}

interface SimulateResult {
  orderNumber: string
  platform: string
  workOrderId: string
}

const PLATFORM_COLORS: Record<string, string> = {
  "JLL Corrigo": "border-blue-500",
  "ServiceNow": "border-green-500",
  "CBRE Nexus": "border-purple-500",
  "Cushman & Wakefield": "border-red-500",
}

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  "JLL Corrigo": "bg-blue-100 text-blue-700",
  "ServiceNow": "bg-green-100 text-green-700",
  "CBRE Nexus": "bg-purple-100 text-purple-700",
  "Cushman & Wakefield": "bg-red-100 text-red-700",
}

const STATUS_DOT: Record<string, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  pending: "bg-yellow-500",
}

const FALLBACK_PLATFORMS: PlatformStatus[] = [
  { name: "Cushman & Wakefield", subtitle: "AI+ Platform", status: "connected", workOrdersReceived: 847, lastActivity: new Date(Date.now() - 12 * 60000).toISOString(), successRate: 99.2, color: "border-red-500" },
  { name: "CBRE Nexus", subtitle: "Nexus AI Platform", status: "connected", workOrdersReceived: 312, lastActivity: new Date(Date.now() - 45 * 60000).toISOString(), successRate: 98.7, color: "border-purple-500" },
  { name: "JLL Corrigo", subtitle: "CorrigoPro Direct API", status: "connected", workOrdersReceived: 156, lastActivity: new Date(Date.now() - 2 * 3600000).toISOString(), successRate: 97.4, color: "border-blue-500" },
  { name: "ServiceNow", subtitle: "Workplace Service Delivery", status: "ready", workOrdersReceived: 0, lastActivity: "", successRate: 0, color: "border-green-500" },
]

export default function IntegrationsPage() {
  const [platforms, setPlatforms] = useState<PlatformStatus[] | null>(null)
  const [apiUnavailable, setApiUnavailable] = useState(false)
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [selectedPlatform, setSelectedPlatform] = useState("JLL Corrigo")
  const [simulating, setSimulating] = useState(false)
  const [simulateResult, setSimulateResult] = useState<SimulateResult | null>(null)
  const [simulateError, setSimulateError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/v1/integration-status")
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        setPlatforms(data.platforms || data)
      } catch {
        setApiUnavailable(true)
        setPlatforms(FALLBACK_PLATFORMS)
      }
    }
    fetchStatus()
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/webhooks/log")
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setLogs(data.logs || data || [])
    } catch {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 8000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  async function handleSimulate() {
    setSimulating(true)
    setSimulateResult(null)
    setSimulateError(null)
    try {
      const res = await fetch("/api/v1/webhooks/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: selectedPlatform }),
      })
      if (!res.ok) throw new Error("Simulation failed")
      const data = await res.json()
      setSimulateResult({ orderNumber: data.orderNumber, platform: selectedPlatform, workOrderId: data.workOrderId })
      fetchLogs()
    } catch {
      setSimulateError("Failed to simulate webhook. API may not be available.")
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">FM platform connections and webhook activity</p>
      </div>

      {apiUnavailable && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Integration API not available. Showing default platform configuration.
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms ? platforms.map((p) => (
          <Card key={p.name} className={`border-l-4 ${PLATFORM_COLORS[p.name] || p.color}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                </div>
                <Badge className={p.status === "connected" ? "bg-green-100 text-green-700 border-green-200" : "bg-blue-100 text-blue-700 border-blue-200"}>
                  {p.status === "connected" ? "Connected" : "Ready"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{p.workOrdersReceived}</div>
                  <div className="text-[10px] text-muted-foreground">Work orders</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{p.lastActivity ? formatDistanceToNow(new Date(p.lastActivity), { addSuffix: true }) : "No activity"}</div>
                  <div className="text-[10px] text-muted-foreground">Last activity</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{p.successRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Success rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))
        )}
      </div>

      {/* Webhook Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Webhook Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No activity yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Platform</th>
                    <th className="pb-2 pr-4 font-medium">Direction</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Work Order</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.time), { addSuffix: true })}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline" className={PLATFORM_BADGE_COLORS[log.platform] || ""}>
                          {log.platform}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {log.direction === "inbound" ? "\u2193 Inbound" : "\u2191 Outbound"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[log.status]}`} />
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {log.workOrderId ? (
                          <Link href={`/orders/${log.workOrderId}`} className="text-xs text-primary hover:underline">
                            {log.workOrderNumber || log.workOrderId}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulate Inbound Work Order */}
      <Card className="bg-slate-50 border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Simulate Inbound Work Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-full sm:w-64">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Platform</label>
              <Select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
                <option value="JLL Corrigo">JLL Corrigo</option>
                <option value="ServiceNow">ServiceNow</option>
                <option value="CBRE Nexus">CBRE Nexus</option>
                <option value="Cushman & Wakefield">Cushman &amp; Wakefield</option>
              </Select>
            </div>
            <Button className="h-12 px-8" onClick={handleSimulate} disabled={simulating}>
              {simulating ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Simulating...
                </span>
              ) : (
                "Simulate"
              )}
            </Button>
          </div>

          {simulateResult && (
            <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center justify-between">
              <span>{"\u2713"} Work order {simulateResult.orderNumber} created from {simulateResult.platform}</span>
              <Link href={`/orders/${simulateResult.workOrderId}`} className="text-green-700 font-medium hover:underline">
                View Work Order &rarr;
              </Link>
            </div>
          )}

          {simulateError && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {simulateError}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
