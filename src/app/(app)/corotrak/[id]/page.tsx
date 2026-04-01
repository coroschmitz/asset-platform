"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Users,
  ArrowRightLeft,
  Warehouse,
  PackageCheck,
  Search,
  Download,
  CheckCircle2,
  Radio,
  ScanLine,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface Move {
  id: string
  firstName: string
  lastName: string
  employeeNumber: string
  originLocation: string
  originFloor: string
  originRoom: string
  destLocation: string
  destFloor: string
  destRoom: string
  workItemCount: number
  isStorage: boolean
  isInterBuilding: boolean
  status: string
  rfidVerified: boolean
  completedAt: string | null
}

interface ImportData {
  id: string
  workOrderNumber: string
  fileName: string
  totalPersonMoves: number
  totalWorkItems: number
  originBuildings: string[]
  destBuildings: string[]
  storageCount: number
  interBuildingCount: number
  intraBuildingCount: number
  status: string
  importedAt: string
  client: { name: string; fullName: string }
  moves: Move[]
  summary: {
    statusBreakdown: Record<string, number>
    rfidVerifiedCount: number
    rfidUnverifiedCount: number
  }
}

interface Analytics {
  moveFlow: { from: string; to: string; count: number }[]
  floorHeatmap: { floor: string; originCount: number; destCount: number }[]
  statusBreakdown: { status: string; count: number }[]
  storageAnalysis: {
    totalToStorage: number
    percentage: number
    byFloor: { floor: string; count: number }[]
  }
  timeline: {
    completed: number
    inProgress: number
    pending: number
    total: number
    completionPercentage: number
  }
}

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "STORAGE", label: "Storage" },
]

const MOVE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
}

const FLOW_COLORS = ["#ea580c", "#2563eb", "#7c3aed", "#059669", "#d97706"]

function buildMockDetailData(): { importData: ImportData; analytics: Analytics } {
  const moves: Move[] = [
    { id: "m1", firstName: "AARON", lastName: "ROBLES", employeeNumber: "695463", originLocation: "LAX2126", originFloor: "05.C", originRoom: "05.C.02E", destLocation: "LAX2126", destFloor: "05.A", destRoom: "05.A.23B", workItemCount: 10, isStorage: false, isInterBuilding: false, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-14T16:00:00Z" },
    { id: "m2", firstName: "ADAM", lastName: "HODGSON", employeeNumber: "226986", originLocation: "LAX2105", originFloor: "03.D", originRoom: "03.D.31D", destLocation: "LAX2126", destFloor: "03.C", destRoom: "03.C.01D", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-14T14:30:00Z" },
    { id: "m3", firstName: "ALEX", lastName: "POCASANGRE", employeeNumber: "751011", originLocation: "LAX2126", originFloor: "05.A", originRoom: "05.A.32B", destLocation: "LAX2126", destFloor: "02", destRoom: "STORAGE", workItemCount: 10, isStorage: true, isInterBuilding: false, status: "COMPLETED", rfidVerified: false, completedAt: "2026-03-15T09:00:00Z" },
    { id: "m4", firstName: "ANDREW", lastName: "HUANG", employeeNumber: "558835", originLocation: "LAX2105", originFloor: "03.B", originRoom: "03.B.20D", destLocation: "LAX2126", destFloor: "03.C", destRoom: "03.C.06I", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "IN_PROGRESS", rfidVerified: false, completedAt: null },
    { id: "m5", firstName: "BRADY", lastName: "FREEMAN", employeeNumber: "225482", originLocation: "LAX2126", originFloor: "03.D", originRoom: "03.D.24D", destLocation: "LAX2126", destFloor: "03.A", destRoom: "03.A.20C", workItemCount: 10, isStorage: false, isInterBuilding: false, status: "PENDING", rfidVerified: false, completedAt: null },
    { id: "m6", firstName: "CHRIS", lastName: "WNUK", employeeNumber: "375485", originLocation: "LAX2105", originFloor: "03.A", originRoom: "03.A.29D", destLocation: "LAX2126", destFloor: "03.C", destRoom: "03.C.02D", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-14T15:00:00Z" },
    { id: "m7", firstName: "CAROL", lastName: "KIM", employeeNumber: "700582", originLocation: "LAX2105", originFloor: "03.D", originRoom: "03.D.25D", destLocation: "LAX2126", destFloor: "03.D", destRoom: "03.D.21C", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "IN_PROGRESS", rfidVerified: false, completedAt: null },
    { id: "m8", firstName: "ERIC", lastName: "ETCHEVERRY", employeeNumber: "704912", originLocation: "LAX2126", originFloor: "02.D", originRoom: "02.D.24B", destLocation: "LAX2126", destFloor: "02", destRoom: "STORAGE", workItemCount: 10, isStorage: true, isInterBuilding: false, status: "PENDING", rfidVerified: false, completedAt: null },
    { id: "m9", firstName: "DANIEL", lastName: "MARTINEZ", employeeNumber: "482910", originLocation: "LAX2105", originFloor: "03.C", originRoom: "03.C.15A", destLocation: "LAX2126", destFloor: "05.B", destRoom: "05.B.08D", workItemCount: 12, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-14T11:45:00Z" },
    { id: "m10", firstName: "ELENA", lastName: "VASQUEZ", employeeNumber: "329847", originLocation: "LAX2126", originFloor: "03.B", originRoom: "03.B.11C", destLocation: "LAX2126", destFloor: "05.A", destRoom: "05.A.19F", workItemCount: 8, isStorage: false, isInterBuilding: false, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-14T13:20:00Z" },
    { id: "m11", firstName: "FRANK", lastName: "NGUYEN", employeeNumber: "518734", originLocation: "LAX2105", originFloor: "02.A", originRoom: "02.A.05B", destLocation: "LAX2126", destFloor: "03.A", destRoom: "03.A.14E", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-15T08:30:00Z" },
    { id: "m12", firstName: "GRACE", lastName: "CHEN", employeeNumber: "674291", originLocation: "LAX2126", originFloor: "05.B", originRoom: "05.B.22A", destLocation: "LAX2126", destFloor: "02", destRoom: "STORAGE", workItemCount: 10, isStorage: true, isInterBuilding: false, status: "COMPLETED", rfidVerified: false, completedAt: "2026-03-15T10:15:00Z" },
    { id: "m13", firstName: "HANNAH", lastName: "SHAW", employeeNumber: "891245", originLocation: "LAX2105", originFloor: "03.A", originRoom: "03.A.08C", destLocation: "LAX2126", destFloor: "03.B", destRoom: "03.B.16D", workItemCount: 14, isStorage: false, isInterBuilding: true, status: "IN_PROGRESS", rfidVerified: false, completedAt: null },
    { id: "m14", firstName: "IVAN", lastName: "PETROV", employeeNumber: "423867", originLocation: "LAX2126", originFloor: "03.C", originRoom: "03.C.29B", destLocation: "LAX2126", destFloor: "05.C", destRoom: "05.C.11A", workItemCount: 10, isStorage: false, isInterBuilding: false, status: "PENDING", rfidVerified: false, completedAt: null },
    { id: "m15", firstName: "JENNIFER", lastName: "OKAFOR", employeeNumber: "756198", originLocation: "LAX2105", originFloor: "02.B", originRoom: "02.B.18D", destLocation: "LAX2126", destFloor: "03.D", destRoom: "03.D.07B", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-14T17:00:00Z" },
    { id: "m16", firstName: "KEVIN", lastName: "THOMPSON", employeeNumber: "384721", originLocation: "LAX2126", originFloor: "05.A", originRoom: "05.A.04C", destLocation: "LAX2126", destFloor: "02", destRoom: "STORAGE", workItemCount: 10, isStorage: true, isInterBuilding: false, status: "IN_PROGRESS", rfidVerified: false, completedAt: null },
    { id: "m17", firstName: "LISA", lastName: "PARK", employeeNumber: "629483", originLocation: "LAX2105", originFloor: "03.B", originRoom: "03.B.25A", destLocation: "LAX2126", destFloor: "05.B", destRoom: "05.B.14C", workItemCount: 8, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-15T11:30:00Z" },
    { id: "m18", firstName: "MARCUS", lastName: "WILLIAMS", employeeNumber: "847362", originLocation: "LAX2126", originFloor: "03.A", originRoom: "03.A.21D", destLocation: "LAX2126", destFloor: "03.C", destRoom: "03.C.18A", workItemCount: 10, isStorage: false, isInterBuilding: false, status: "PENDING", rfidVerified: false, completedAt: null },
    { id: "m19", firstName: "NATALIE", lastName: "FOSTER", employeeNumber: "513978", originLocation: "LAX2105", originFloor: "03.D", originRoom: "03.D.12B", destLocation: "LAX2126", destFloor: "03.A", destRoom: "03.A.26C", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: false, completedAt: "2026-03-15T14:45:00Z" },
    { id: "m20", firstName: "OSCAR", lastName: "RAMIREZ", employeeNumber: "291847", originLocation: "LAX2126", originFloor: "02.C", originRoom: "02.C.09A", destLocation: "LAX2126", destFloor: "05.A", destRoom: "05.A.31D", workItemCount: 12, isStorage: false, isInterBuilding: false, status: "IN_PROGRESS", rfidVerified: false, completedAt: null },
    { id: "m21", firstName: "PATRICIA", lastName: "LEWIS", employeeNumber: "468215", originLocation: "LAX2105", originFloor: "02.C", originRoom: "02.C.22B", destLocation: "LAX2126", destFloor: "03.B", destRoom: "03.B.09E", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "PENDING", rfidVerified: false, completedAt: null },
    { id: "m22", firstName: "ROBERT", lastName: "GARCIA", employeeNumber: "738492", originLocation: "LAX2126", originFloor: "03.D", originRoom: "03.D.33A", destLocation: "LAX2126", destFloor: "02", destRoom: "STORAGE", workItemCount: 10, isStorage: true, isInterBuilding: false, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-15T15:30:00Z" },
    { id: "m23", firstName: "SARAH", lastName: "JOHNSON", employeeNumber: "924617", originLocation: "LAX2105", originFloor: "03.C", originRoom: "03.C.28D", destLocation: "LAX2126", destFloor: "05.C", destRoom: "05.C.06B", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "COMPLETED", rfidVerified: true, completedAt: "2026-03-14T12:00:00Z" },
    { id: "m24", firstName: "THOMAS", lastName: "WRIGHT", employeeNumber: "156839", originLocation: "LAX2126", originFloor: "05.C", originRoom: "05.C.18D", destLocation: "LAX2126", destFloor: "03.D", destRoom: "03.D.15A", workItemCount: 10, isStorage: false, isInterBuilding: false, status: "PENDING", rfidVerified: false, completedAt: null },
    { id: "m25", firstName: "URSULA", lastName: "BECK", employeeNumber: "647382", originLocation: "LAX2105", originFloor: "03.A", originRoom: "03.A.17C", destLocation: "LAX2126", destFloor: "03.C", destRoom: "03.C.24A", workItemCount: 10, isStorage: false, isInterBuilding: true, status: "IN_PROGRESS", rfidVerified: false, completedAt: null },
  ]
  return {
    importData: {
      id: "mock-1", workOrderNumber: "OCA63814-1", fileName: "WorkOrder_OCA63814-1.xlsx",
      totalPersonMoves: 336, totalWorkItems: 3360, originBuildings: ["LAX2105", "LAX2126"],
      destBuildings: ["LAX2126"], storageCount: 46, interBuildingCount: 203, intraBuildingCount: 133,
      status: "COMPLETED", importedAt: "2026-03-15T14:30:00Z",
      client: { name: "AAA", fullName: "Automobile Club of Southern California" },
      moves,
      summary: { statusBreakdown: { PENDING: 85, IN_PROGRESS: 48, COMPLETED: 203 }, rfidVerifiedCount: 198, rfidUnverifiedCount: 138 },
    },
    analytics: {
      moveFlow: [
        { from: "LAX2105", to: "LAX2126", count: 203 },
        { from: "LAX2126", to: "LAX2126", count: 87 },
        { from: "LAX2126", to: "STORAGE", count: 46 },
      ],
      floorHeatmap: [
        { floor: "LAX2105-03.A", originCount: 32, destCount: 0 },
        { floor: "LAX2105-03.B", originCount: 28, destCount: 0 },
        { floor: "LAX2105-03.D", originCount: 45, destCount: 0 },
        { floor: "LAX2126-02.D", originCount: 18, destCount: 4 },
        { floor: "LAX2126-03.A", originCount: 12, destCount: 38 },
        { floor: "LAX2126-03.C", originCount: 8, destCount: 62 },
        { floor: "LAX2126-03.D", originCount: 22, destCount: 35 },
        { floor: "LAX2126-05.A", originCount: 36, destCount: 48 },
        { floor: "LAX2126-05.C", originCount: 24, destCount: 16 },
        { floor: "STORAGE", originCount: 0, destCount: 46 },
      ],
      statusBreakdown: [
        { status: "COMPLETED", count: 203 },
        { status: "IN_PROGRESS", count: 48 },
        { status: "PENDING", count: 85 },
      ],
      storageAnalysis: {
        totalToStorage: 46, percentage: 13.7,
        byFloor: [
          { floor: "LAX2126-05.A", count: 18 },
          { floor: "LAX2126-02.D", count: 14 },
          { floor: "LAX2126-05.C", count: 8 },
          { floor: "LAX2126-03.D", count: 6 },
        ],
      },
      timeline: { completed: 203, inProgress: 48, pending: 85, total: 336, completionPercentage: 60.4 },
    },
  }
}

export default function CoroTrakDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [importData, setImportData] = useState<ImportData | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [importRes, analyticsRes] = await Promise.all([
        fetch(`/api/v1/corotrak/imports/${id}`),
        fetch(`/api/v1/corotrak/imports/${id}/analytics`),
      ])
      const importJson = await importRes.json()
      const analyticsJson = await analyticsRes.json()
      if (importJson.success && importJson.data?.moves?.length > 0) {
        setImportData(importJson.data)
      } else {
        const mock = buildMockDetailData()
        setImportData(mock.importData)
      }
      if (analyticsJson.success && analyticsJson.data?.moveFlow?.length > 0) {
        setAnalytics(analyticsJson.data)
      } else {
        const mock = buildMockDetailData()
        setAnalytics(mock.analytics)
      }
    } catch {
      const mock = buildMockDetailData()
      setImportData(mock.importData)
      setAnalytics(mock.analytics)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredMoves = importData?.moves.filter((m) => {
    if (statusFilter === "STORAGE") return m.isStorage
    if (statusFilter !== "ALL" && m.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.employeeNumber.includes(q)
      )
    }
    return true
  }) ?? []

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      await fetch(`/api/v1/corotrak/imports/${id}/moves`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveIds: [...selectedIds], status: "COMPLETED" }),
      })
      setSelectedIds(new Set())
      fetchData()
    } catch {
      // silent
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleExportCsv = () => {
    if (!importData) return
    const headers = [
      "First Name", "Last Name", "Employee #",
      "Origin Location", "Origin Floor", "Origin Room",
      "Dest Location", "Dest Floor", "Dest Room",
      "Work Items", "Status", "RFID Verified",
    ]
    const csvRows = [headers.join(",")]
    for (const m of importData.moves) {
      csvRows.push([
        m.firstName, m.lastName, m.employeeNumber,
        m.originLocation, m.originFloor, m.originRoom,
        m.destLocation, m.destFloor, m.destRoom,
        m.workItemCount, m.status, m.rfidVerified ? "Yes" : "No",
      ].join(","))
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${importData.workOrderNumber}-moves.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSelect = (moveId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(moveId)) next.delete(moveId)
      else next.add(moveId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMoves.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMoves.map((m) => m.id)))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!importData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Import not found</p>
        <Link href="/corotrak">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to CoroTrak
          </Button>
        </Link>
      </div>
    )
  }

  const interBuildingPct = importData.totalPersonMoves > 0
    ? Math.round((importData.interBuildingCount / importData.totalPersonMoves) * 100)
    : 0
  const storagePct = importData.totalPersonMoves > 0
    ? Math.round((importData.storageCount / importData.totalPersonMoves) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/corotrak" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">{importData.workOrderNumber}</h1>
            <Badge className={cn("text-xs", MOVE_STATUS_COLORS[importData.status] || "bg-gray-100 text-gray-700")}>
              {importData.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground ml-8">
            <span>{importData.client.name}</span>
            <span>·</span>
            <span>{format(new Date(importData.importedAt), "MMM d, yyyy h:mm a")}</span>
            <span>·</span>
            <span>{importData.fileName}</span>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{importData.totalPersonMoves}</p>
                <p className="text-xs text-muted-foreground">Total Person Moves</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <ArrowRightLeft className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {importData.interBuildingCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">({interBuildingPct}%)</span>
                </p>
                <p className="text-xs text-muted-foreground">Inter-Building Transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Warehouse className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {importData.storageCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">({storagePct}%)</span>
                </p>
                <p className="text-xs text-muted-foreground">Moves to Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <PackageCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{importData.totalWorkItems.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Work Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flow Visualization + Floor Heatmap */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Move Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Move Flow Between Buildings</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.moveFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.moveFlow} layout="vertical">
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey={(d: { from: string; to: string }) => `${d.from} → ${d.to}`}
                      width={160}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Moves" radius={[0, 4, 4, 0]}>
                      {analytics.moveFlow.map((_, i) => (
                        <Cell key={i} fill={FLOW_COLORS[i % FLOW_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No flow data</p>
              )}
            </CardContent>
          </Card>

          {/* Floor Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Floor Activity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.floorHeatmap.length > 0 ? (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {analytics.floorHeatmap.map((f) => {
                    const net = f.destCount - f.originCount
                    const maxCount = Math.max(
                      ...analytics.floorHeatmap.map((h) => Math.max(h.originCount, h.destCount)),
                      1
                    )
                    return (
                      <div key={f.floor} className="flex items-center gap-2 text-xs">
                        <span className="w-28 truncate font-mono text-muted-foreground">{f.floor}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <div
                            className="h-4 rounded-sm bg-red-400"
                            style={{ width: `${(f.originCount / maxCount) * 100}%`, minWidth: f.originCount > 0 ? 4 : 0 }}
                            title={`Leaving: ${f.originCount}`}
                          />
                          <div
                            className={cn(
                              "h-4 rounded-sm",
                              f.floor === "STORAGE" ? "bg-blue-400" : "bg-green-400"
                            )}
                            style={{ width: `${(f.destCount / maxCount) * 100}%`, minWidth: f.destCount > 0 ? 4 : 0 }}
                            title={`Arriving: ${f.destCount}`}
                          />
                        </div>
                        <span className={cn(
                          "w-10 text-right font-medium",
                          net > 0 ? "text-green-600" : net < 0 ? "text-red-600" : "text-gray-400"
                        )}>
                          {net > 0 ? "+" : ""}{net}
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-400" /> Leaving</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-400" /> Arriving</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-400" /> Storage</div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No floor data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Person Move Cards (CoroTrak Style) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Person Moves ({filteredMoves.length})</CardTitle>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkComplete}
                  disabled={bulkUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Complete ({selectedIds.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border overflow-hidden">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); setSelectedIds(new Set()) }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === tab.key
                      ? "bg-[#ea580c] text-white"
                      : "text-muted-foreground hover:bg-gray-50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or employee #"
                className="pl-9 h-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={filteredMoves.length > 0 && selectedIds.size === filteredMoves.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
              Select all
            </label>
          </div>

          {/* Person Cards Grid */}
          <div className="space-y-2">
            {filteredMoves.map((m) => {
              const pct = m.status === "COMPLETED" ? 100 : m.status === "IN_PROGRESS" ? 62 : 0
              return (
                <div
                  key={m.id}
                  className={cn(
                    "border rounded-lg p-4 transition-colors hover:shadow-sm",
                    selectedIds.has(m.id) ? "border-[#ea580c] bg-orange-50/30" : "border-gray-200"
                  )}
                  onClick={() => toggleSelect(m.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded mt-0.5"
                      />
                      <div>
                        <div className="font-semibold text-sm">{m.firstName} {m.lastName}</div>
                        <div className="text-xs text-muted-foreground font-mono">#{m.employeeNumber}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", MOVE_STATUS_COLORS[m.status] || "bg-gray-100 text-gray-700")}>
                          {m.status === "COMPLETED" ? "Completed" : m.status === "IN_PROGRESS" ? "In Progress" : "Pending"}
                        </Badge>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                      <div className="text-lg font-bold mt-0.5">{m.workItemCount} <span className="text-xs font-normal text-muted-foreground">Items</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Origin</div>
                      <div className="text-xs mt-0.5">
                        <span className="font-medium">Location</span> {m.originLocation}
                      </div>
                      <div className="text-xs text-muted-foreground">Floor: {m.originFloor}</div>
                      <div className="text-xs text-muted-foreground">Room: {m.originRoom}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Destination</div>
                      {m.isStorage ? (
                        <div className="text-xs mt-0.5">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">STORAGE</Badge>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs mt-0.5">
                            <span className="font-medium">Location</span> {m.destLocation}
                          </div>
                          <div className="text-xs text-muted-foreground">Floor: {m.destFloor}</div>
                          <div className="text-xs text-muted-foreground">Room: {m.destRoom}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          m.status === "COMPLETED" ? "bg-[#2563eb]" : m.status === "IN_PROGRESS" ? "bg-[#2563eb]" : "bg-gray-300"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* RFID indicator */}
                  {m.rfidVerified && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-green-700">
                      <Radio className="h-3 w-3" /> RFID Verified
                    </div>
                  )}
                </div>
              )
            })}
            {filteredMoves.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">No moves match your filters</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RFID Verification Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">RFID Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-green-50">
                  <Radio className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{importData.summary.rfidVerifiedCount}</p>
                  <p className="text-xs text-muted-foreground">RFID Verified</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-gray-100">
                  <Radio className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{importData.summary.rfidUnverifiedCount}</p>
                  <p className="text-xs text-muted-foreground">Not Verified</p>
                </div>
              </div>
              {importData.totalPersonMoves > 0 && (
                <div className="ml-4">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${(importData.summary.rfidVerifiedCount / importData.totalPersonMoves) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round((importData.summary.rfidVerifiedCount / importData.totalPersonMoves) * 100)}% verified
                  </p>
                </div>
              )}
            </div>
            <Button variant="outline" disabled>
              <ScanLine className="h-4 w-4 mr-2" />
              Start RFID Scan Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
