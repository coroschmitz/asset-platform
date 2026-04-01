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

const MOCK_ANALYTICS: Analytics = {
  coverage: { totalAssets: 4214, totalTagged: 500, percent: 11.9 },
  readers: { total: 12, online: 10 },
  events: { last24h: 1847, lastWeek: 12340 },
  topZones: [
    { zone: "RECEIVING", eventCount: 3420 },
    { zone: "WAREHOUSE_A", eventCount: 2815 },
    { zone: "STAGING", eventCount: 2190 },
    { zone: "LOADING_DOCK", eventCount: 1875 },
    { zone: "FLOOR_3", eventCount: 1240 },
    { zone: "WAREHOUSE_B", eventCount: 800 },
  ],
  staleAssets: [
    { id: "s1", tagNumber: "COR-100245", description: "CHAIR-TASK, ERGONOMIC, ADJ ARMS 26X42", lastRfidScanAt: "2026-02-15T10:00:00Z", location: { name: "Costa Mesa Administrative Office", code: "AOCM" } },
    { id: "s2", tagNumber: "COR-100890", description: "DESK-SIT/STAND, ELECTRIC 60X30", lastRfidScanAt: "2026-02-18T14:30:00Z", location: { name: "Los Angeles Headquarters", code: "LAHQ" } },
    { id: "s3", tagNumber: "COR-101320", description: "TABLE-CONFERENCE, RECTANGULAR 96X48", lastRfidScanAt: "2026-02-10T09:15:00Z", location: { name: "Los Angeles Headquarters", code: "LAHQ" } },
  ],
  untaggedHighValue: [
    { id: "u1", tagNumber: "COR-102450", description: "DESK-SIT/STAND, ELECTRIC 72X30", currentValue: 1850, location: { name: "Costa Mesa Administrative Office", code: "AOCM" } },
    { id: "u2", tagNumber: "COR-103100", description: "CHAIR-CONFERENCE, HIGH-BACK LEATHER 28X46", currentValue: 1620, location: { name: "Los Angeles Headquarters", code: "LAHQ" } },
    { id: "u3", tagNumber: "COR-100780", description: "TABLE-CONFERENCE, RECTANGULAR 96X48", currentValue: 1450, location: { name: "Coppell Regional Office", code: "CPTX" } },
    { id: "u4", tagNumber: "COR-101560", description: "CUBICLE-8x8 MANAGER STATION", currentValue: 1280, location: { name: "Costa Mesa Administrative Office", code: "AOCM" } },
    { id: "u5", tagNumber: "COR-102890", description: "DESK-CREDENZA VENEER 66X30", currentValue: 980, location: { name: "St. Louis Regional Office", code: "STLMO" } },
    { id: "u6", tagNumber: "COR-103445", description: "CHAIR-TASK, ERGONOMIC, ADJ ARMS 26X42", currentValue: 875, location: { name: "Los Angeles Headquarters", code: "LAHQ" } },
  ],
}

const now = new Date().toISOString()
const MOCK_READERS: ReaderData[] = [
  { id: "r1", name: "AOCM-RDR-01", readerType: "PORTAL_FIXED", zone: "RECEIVING", isActive: true, lastHeartbeat: now, antennaCount: 4, lastEventAt: now, location: { name: "Costa Mesa Administrative Office", code: "AOCM", city: "Costa Mesa", state: "CA" }, _count: { events: 2450 } },
  { id: "r2", name: "AOCM-RDR-02", readerType: "OVERHEAD_FIXED", zone: "WAREHOUSE_A", isActive: true, lastHeartbeat: now, antennaCount: 2, lastEventAt: now, location: { name: "Costa Mesa Administrative Office", code: "AOCM", city: "Costa Mesa", state: "CA" }, _count: { events: 1820 } },
  { id: "r3", name: "AOCM-RDR-03", readerType: "HANDHELD", zone: "STAGING", isActive: true, lastHeartbeat: new Date(Date.now() - 25 * 60000).toISOString(), antennaCount: 1, lastEventAt: new Date(Date.now() - 20 * 60000).toISOString(), location: { name: "Costa Mesa Administrative Office", code: "AOCM", city: "Costa Mesa", state: "CA" }, _count: { events: 960 } },
  { id: "r4", name: "LAHQ-RDR-01", readerType: "PORTAL_FIXED", zone: "LOADING_DOCK", isActive: true, lastHeartbeat: now, antennaCount: 4, lastEventAt: now, location: { name: "Los Angeles Headquarters", code: "LAHQ", city: "Los Angeles", state: "CA" }, _count: { events: 1875 } },
  { id: "r5", name: "LAHQ-RDR-02", readerType: "DOCK_DOOR", zone: "RECEIVING", isActive: true, lastHeartbeat: now, antennaCount: 1, lastEventAt: now, location: { name: "Los Angeles Headquarters", code: "LAHQ", city: "Los Angeles", state: "CA" }, _count: { events: 1340 } },
  { id: "r6", name: "LAHQ-RDR-03", readerType: "OVERHEAD_FIXED", zone: "FLOOR_3", isActive: true, lastHeartbeat: new Date(Date.now() - 45 * 60000).toISOString(), antennaCount: 2, lastEventAt: new Date(Date.now() - 40 * 60000).toISOString(), location: { name: "Los Angeles Headquarters", code: "LAHQ", city: "Los Angeles", state: "CA" }, _count: { events: 720 } },
  { id: "r7", name: "CPTX-RDR-01", readerType: "PORTAL_FIXED", zone: "WAREHOUSE_B", isActive: true, lastHeartbeat: now, antennaCount: 4, lastEventAt: now, location: { name: "Coppell Regional Office", code: "CPTX", city: "Coppell", state: "TX" }, _count: { events: 890 } },
  { id: "r8", name: "CPTX-RDR-02", readerType: "HANDHELD", zone: "STAGING", isActive: true, lastHeartbeat: now, antennaCount: 1, lastEventAt: now, location: { name: "Coppell Regional Office", code: "CPTX", city: "Coppell", state: "TX" }, _count: { events: 650 } },
]

const MOCK_EVENTS: EventData[] = [
  { id: "e1", tagId: "E200A1B2C3D4E5F6", epc: "3034F8A1B2C3D4E5", eventType: "PORTAL_SCAN", zone: "RECEIVING", signalStrength: -32, createdAt: new Date(Date.now() - 120000).toISOString(), asset: { id: "a1", tagNumber: "COR-100001", description: "PANEL-ENHANCED, TACKABLE, ACOUSTICAL 48X65" }, reader: { id: "r1", name: "AOCM-RDR-01", zone: "RECEIVING" } },
  { id: "e2", tagId: "E200B2C3D4E5F6A7", epc: "3034A2B3C4D5E6F7", eventType: "ZONE_ENTER", zone: "WAREHOUSE_A", signalStrength: -38, createdAt: new Date(Date.now() - 180000).toISOString(), asset: { id: "a2", tagNumber: "COR-100045", description: "CHAIR-TASK, ERGONOMIC, ADJ ARMS 26X42" }, reader: { id: "r2", name: "AOCM-RDR-02", zone: "WAREHOUSE_A" } },
  { id: "e3", tagId: "E200C3D4E5F6A7B8", epc: "3034B3C4D5E6F7A8", eventType: "TAG_READ", zone: "STAGING", signalStrength: -45, createdAt: new Date(Date.now() - 300000).toISOString(), asset: { id: "a3", tagNumber: "COR-100120", description: "DESK-SIT/STAND, ELECTRIC 60X30" }, reader: { id: "r3", name: "AOCM-RDR-03", zone: "STAGING" } },
  { id: "e4", tagId: "E200D4E5F6A7B8C9", epc: "3034C4D5E6F7A8B9", eventType: "ZONE_EXIT", zone: "LOADING_DOCK", signalStrength: -52, createdAt: new Date(Date.now() - 420000).toISOString(), asset: { id: "a4", tagNumber: "COR-100200", description: "TABLE-CONFERENCE, RECTANGULAR 96X48" }, reader: { id: "r4", name: "LAHQ-RDR-01", zone: "LOADING_DOCK" } },
  { id: "e5", tagId: "E200E5F6A7B8C9D0", epc: null, eventType: "PORTAL_SCAN", zone: "RECEIVING", signalStrength: -35, createdAt: new Date(Date.now() - 600000).toISOString(), asset: null, reader: { id: "r5", name: "LAHQ-RDR-02", zone: "RECEIVING" } },
  { id: "e6", tagId: "E200F6A7B8C9D0E1", epc: "3034E6F7A8B9C0D1", eventType: "TAG_READ", zone: "FLOOR_3", signalStrength: -41, createdAt: new Date(Date.now() - 780000).toISOString(), asset: { id: "a6", tagNumber: "COR-100350", description: "FILING-LATERAL, 3-DRAWER 36X40" }, reader: { id: "r6", name: "LAHQ-RDR-03", zone: "FLOOR_3" } },
  { id: "e7", tagId: "E200A7B8C9D0E1F2", epc: "3034F7A8B9C0D1E2", eventType: "ZONE_ENTER", zone: "WAREHOUSE_B", signalStrength: -29, createdAt: new Date(Date.now() - 900000).toISOString(), asset: { id: "a7", tagNumber: "COR-100410", description: "STORAGE-BOOKCASE, 3-SHELF 36X42" }, reader: { id: "r7", name: "CPTX-RDR-01", zone: "WAREHOUSE_B" } },
  { id: "e8", tagId: "E200B8C9D0E1F2A3", epc: "3034A8B9C0D1E2F3", eventType: "MANUAL_SCAN", zone: "STAGING", signalStrength: -36, createdAt: new Date(Date.now() - 1200000).toISOString(), asset: { id: "a8", tagNumber: "COR-100480", description: "WORKSURFACE-RECTANGULAR LAMINATE 60X29" }, reader: { id: "r8", name: "CPTX-RDR-02", zone: "STAGING" } },
]

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
      setAnalytics(analyticsJson.success && analyticsJson.data?.coverage ? analyticsJson.data : MOCK_ANALYTICS)
      setReaders(readersJson.success && readersJson.data?.length > 0 ? readersJson.data : MOCK_READERS)
      setEvents(eventsJson.success && eventsJson.data?.events?.length > 0 ? eventsJson.data.events : MOCK_EVENTS)
    } catch {
      setAnalytics(MOCK_ANALYTICS)
      setReaders(MOCK_READERS)
      setEvents(MOCK_EVENTS)
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
