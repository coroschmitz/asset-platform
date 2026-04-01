"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Radio,
  Wifi,
  WifiOff,
  Tag,
  MapPin,
  Search,
  Upload,
  ScanLine,
  Activity,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
} from "lucide-react"

interface ReaderData {
  id: string
  name: string
  readerType: string
  zone: string | null
  isActive: boolean
  lastHeartbeat: string | null
  antennaCount: number
  lastEventAt: string | null
  location: { name: string; code: string; city: string; state: string }
  _count: { events: number }
}

interface EventData {
  id: string
  tagId: string
  epc: string | null
  eventType: string
  zone: string | null
  signalStrength: number | null
  createdAt: string
  asset: { id: string; tagNumber: string; description: string } | null
  reader: { id: string; name: string; zone: string | null } | null
}

interface Analytics {
  coverage: { totalAssets: number; totalTagged: number; percent: number }
  readers: { total: number; online: number }
  events: { last24h: number; lastWeek: number }
  topZones: { zone: string; eventCount: number }[]
  staleAssets: { id: string; tagNumber: string; description: string; lastRfidScanAt: string; location: { name: string; code: string } }[]
  untaggedHighValue: { id: string; tagNumber: string; description: string; currentValue: number; location: { name: string; code: string } }[]
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  TAG_READ: "bg-gray-100 text-gray-700",
  ZONE_ENTER: "bg-green-100 text-green-700",
  ZONE_EXIT: "bg-red-100 text-red-700",
  PORTAL_SCAN: "bg-blue-100 text-blue-700",
  MANUAL_SCAN: "bg-purple-100 text-purple-700",
  BULK_SCAN: "bg-orange-100 text-orange-700",
}

const READER_TYPE_COLORS: Record<string, string> = {
  PORTAL_FIXED: "bg-blue-100 text-blue-700",
  HANDHELD: "bg-purple-100 text-purple-700",
  OVERHEAD_FIXED: "bg-orange-100 text-orange-700",
  DOCK_DOOR: "bg-green-100 text-green-700",
}

function readerStatus(lastHeartbeat: string | null): { color: string; label: string } {
  if (!lastHeartbeat) return { color: "bg-gray-400", label: "Never" }
  const diff = Date.now() - new Date(lastHeartbeat).getTime()
  if (diff < 5 * 60 * 1000) return { color: "bg-green-500", label: "Online" }
  if (diff < 30 * 60 * 1000) return { color: "bg-yellow-500", label: "Idle" }
  return { color: "bg-red-500", label: "Offline" }
}

export default function RfidPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [readers, setReaders] = useState<ReaderData[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [eventZoneFilter, setEventZoneFilter] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("")
  const [tagAssetSearch, setTagAssetSearch] = useState("")
  const [tagIdInput, setTagIdInput] = useState("")
  const [epcInput, setEpcInput] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignResult, setAssignResult] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [analyticsRes, readersRes, eventsRes] = await Promise.all([
        fetch("/api/v1/rfid/analytics"),
        fetch("/api/v1/rfid/readers"),
        fetch("/api/v1/rfid/events?pageSize=30"),
      ])
      const [analyticsJson, readersJson, eventsJson] = await Promise.all([
        analyticsRes.json(),
        readersRes.json(),
        eventsRes.json(),
      ])
      if (analyticsJson.success) setAnalytics(analyticsJson.data)
      if (readersJson.success) setReaders(readersJson.data)
      if (eventsJson.success) setEvents(eventsJson.data.events)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "30" })
      if (eventZoneFilter) params.set("zone", eventZoneFilter)
      if (eventTypeFilter) params.set("eventType", eventTypeFilter)
      const res = await fetch(`/api/v1/rfid/events?${params}`)
      const json = await res.json()
      if (json.success) setEvents(json.data.events)
    } catch {
      // silent
    }
  }, [eventZoneFilter, eventTypeFilter])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Auto-refresh events every 5 seconds
  useEffect(() => {
    intervalRef.current = setInterval(fetchEvents, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchEvents])

  const handleAssignTag = async () => {
    if (!tagAssetSearch || !tagIdInput || !epcInput) return
    setAssigning(true)
    setAssignResult(null)
    try {
      // Search for asset by tag number
      const res = await fetch("/api/v1/rfid/tags/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [{ tagNumber: tagAssetSearch, tagId: tagIdInput, epc: epcInput }],
        }),
      })
      const json = await res.json()
      if (json.success) {
        if (json.data.assigned > 0) {
          setAssignResult("Tag assigned successfully")
          setTagAssetSearch("")
          setTagIdInput("")
          setEpcInput("")
          fetchAll()
        } else if (json.data.notFound.length > 0) {
          setAssignResult(`Asset not found: ${json.data.notFound[0]}`)
        } else if (json.data.errors.length > 0) {
          setAssignResult(json.data.errors[0])
        }
      }
    } catch {
      setAssignResult("Assignment failed")
    } finally {
      setAssigning(false)
    }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.trim().split("\n")
    if (lines.length < 2) return

    const assignments = lines.slice(1).map((line) => {
      const [tagNumber, tagId, epc] = line.split(",").map((s) => s.trim())
      return { tagNumber, tagId, epc }
    }).filter((a) => a.tagNumber && a.tagId && a.epc)

    try {
      const res = await fetch("/api/v1/rfid/tags/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      })
      const json = await res.json()
      if (json.success) {
        setAssignResult(
          `Bulk: ${json.data.assigned} assigned, ${json.data.notFound.length} not found, ${json.data.errors.length} errors`
        )
        fetchAll()
      }
    } catch {
      setAssignResult("Bulk upload failed")
    }
    e.target.value = ""
  }

  const zones = [...new Set(readers.map((r) => r.zone).filter(Boolean))] as string[]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const onlinePercent = analytics
    ? analytics.readers.total > 0
      ? analytics.readers.online / analytics.readers.total
      : 0
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RFID Asset Tracking</h1>
          <p className="text-sm text-muted-foreground">Monitor readers, track events, and manage tag assignments</p>
        </div>
        <Link href="/rfid/scan">
          <Button className="bg-[#ea580c] hover:bg-[#c2410c]">
            <ScanLine className="h-4 w-4 mr-2" />
            Manual Scan
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Tag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.coverage.percent}%</p>
                  <p className="text-xs text-muted-foreground">
                    Tag Coverage ({analytics.coverage.totalTagged.toLocaleString()}/{analytics.coverage.totalAssets.toLocaleString()})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", onlinePercent >= 1 ? "bg-green-50" : onlinePercent >= 0.5 ? "bg-yellow-50" : "bg-red-50")}>
                  {onlinePercent >= 0.5 ? (
                    <Wifi className={cn("h-5 w-5", onlinePercent >= 1 ? "text-green-600" : "text-yellow-600")} />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {analytics.readers.online}/{analytics.readers.total}
                  </p>
                  <p className="text-xs text-muted-foreground">Readers Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.events.last24h.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Events (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs text-muted-foreground">Scan Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reader Status Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Reader Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {readers.map((reader) => {
            const status = readerStatus(reader.lastHeartbeat)
            return (
              <Card key={reader.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", status.color)} />
                      <span className="font-medium text-sm">{reader.name}</span>
                    </div>
                    <Badge className={cn("text-[10px]", READER_TYPE_COLORS[reader.readerType] || "bg-gray-100 text-gray-700")}>
                      {reader.readerType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      <span>{reader.location.name}</span>
                    </div>
                    {reader.zone && (
                      <div className="flex items-center gap-1.5">
                        <Radio className="h-3 w-3" />
                        <span>Zone: {reader.zone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t">
                      <span>
                        {reader.lastHeartbeat
                          ? formatDistanceToNow(new Date(reader.lastHeartbeat), { addSuffix: true })
                          : "No heartbeat"}
                      </span>
                      <span className="font-medium">{reader._count.events} events</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {readers.length === 0 && (
            <p className="col-span-full text-center py-8 text-muted-foreground">No readers configured</p>
          )}
        </div>
      </div>

      {/* Live Event Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Live Event Feed</CardTitle>
            <div className="flex items-center gap-2">
              <select
                className="text-xs border rounded px-2 py-1"
                value={eventZoneFilter}
                onChange={(e) => setEventZoneFilter(e.target.value)}
              >
                <option value="">All Zones</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <select
                className="text-xs border rounded px-2 py-1"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {["TAG_READ", "ZONE_ENTER", "ZONE_EXIT", "PORTAL_SCAN", "MANUAL_SCAN", "BULK_SCAN"].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Tag ID</th>
                  <th className="pb-2 font-medium">Asset</th>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Zone</th>
                  <th className="pb-2 font-medium">Reader</th>
                  <th className="pb-2 font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const signalPct = evt.signalStrength
                    ? Math.max(0, Math.min(100, ((evt.signalStrength + 70) / 40) * 100))
                    : 0
                  return (
                    <tr key={evt.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(evt.createdAt), "HH:mm:ss")}
                      </td>
                      <td className="py-2 font-mono text-xs">{evt.tagId.slice(0, 16)}…</td>
                      <td className="py-2">
                        {evt.asset ? (
                          <span className="text-xs">
                            <span className="font-medium">{evt.asset.tagNumber}</span>
                            <span className="text-muted-foreground ml-1">{evt.asset.description.slice(0, 30)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-2">
                        <Badge className={cn("text-[10px]", EVENT_TYPE_COLORS[evt.eventType] || "bg-gray-100")}>
                          {evt.eventType.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs">{evt.zone || "—"}</td>
                      <td className="py-2 text-xs">{evt.reader?.name || "—"}</td>
                      <td className="py-2">
                        {evt.signalStrength != null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  signalPct > 60 ? "bg-green-500" : signalPct > 30 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${signalPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-10">{evt.signalStrength} dBm</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">No events</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tag Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tag Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Asset Tag Number</label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="e.g. COR-100001"
                  className="pl-8 h-8 text-sm"
                  value={tagAssetSearch}
                  onChange={(e) => setTagAssetSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">RFID Tag ID</label>
                <Input
                  placeholder="Tag ID"
                  className="h-8 text-sm mt-1"
                  value={tagIdInput}
                  onChange={(e) => setTagIdInput(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">EPC</label>
                <Input
                  placeholder="EPC"
                  className="h-8 text-sm mt-1"
                  value={epcInput}
                  onChange={(e) => setEpcInput(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAssignTag}
              disabled={assigning || !tagAssetSearch || !tagIdInput || !epcInput}
              className="w-full bg-[#ea580c] hover:bg-[#c2410c]"
            >
              <Tag className="h-4 w-4 mr-1" />
              {assigning ? "Assigning…" : "Assign Tag"}
            </Button>

            <div className="pt-2 border-t">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Bulk Upload (CSV)</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#ea580c] hover:underline">
                <Upload className="h-4 w-4" />
                <span>Upload CSV (tagNumber, tagId, epc)</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBulkUpload}
                />
              </label>
            </div>

            {assignResult && (
              <div className={cn(
                "p-2 rounded text-xs",
                assignResult.includes("success") || assignResult.includes("assigned")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              )}>
                {assignResult}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coverage Gaps */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-base">Coverage Gaps</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              High-value untagged assets (value &gt; $500) — Priority Tagging Queue
            </p>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {analytics?.untaggedHighValue.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 border text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{asset.tagNumber}</span>
                      <span className="text-xs text-muted-foreground truncate">{asset.description.slice(0, 35)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <DollarSign className="h-3 w-3" />
                      <span>${asset.currentValue?.toLocaleString()}</span>
                      <span>·</span>
                      <span>{asset.location.code}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 shrink-0"
                    onClick={() => {
                      setTagAssetSearch(asset.tagNumber)
                      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
                    }}
                  >
                    Assign
                  </Button>
                </div>
              ))}
              {(!analytics?.untaggedHighValue || analytics.untaggedHighValue.length === 0) && (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  All high-value assets are tagged
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
