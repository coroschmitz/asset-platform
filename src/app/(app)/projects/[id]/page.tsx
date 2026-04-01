"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { format, differenceInDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Circle,
  Truck,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react"

interface Milestone {
  id: string
  name: string
  description: string | null
  targetDate: string
  completedDate: string | null
  dependsOn: string | null
  sortOrder: number
  status: string
}

interface Delivery {
  id: string
  vendorName: string
  poNumber: string | null
  expectedDate: string
  receivedDate: string | null
  itemCount: number
  receivedCount: number
  damagedCount: number
  stagingZone: string | null
  inspectedBy: string | null
  notes: string | null
}

interface WorkOrder {
  id: string
  orderNumber: string
  requestType: string
  status: string
  scheduledDate: string | null
  completedDate: string | null
  totalCost: number | null
}

interface ProjectData {
  id: string
  name: string
  projectNumber: string
  description: string | null
  projectType: string
  status: string
  startDate: string | null
  targetDate: string | null
  completedDate: string | null
  budget: number | null
  actualCost: number | null
  totalItems: number
  receivedItems: number
  installedItems: number
  generalContractor: string | null
  projectManager: string | null
  client: { name: string; fullName: string }
  location: { name: string; code: string; city: string; state: string } | null
  milestones: Milestone[]
  deliveries: Delivery[]
  workOrders: WorkOrder[]
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-gray-100 text-gray-700",
  PROCUREMENT: "bg-blue-100 text-blue-700",
  RECEIVING: "bg-indigo-100 text-indigo-700",
  STAGING: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  PUNCH_LIST: "bg-yellow-100 text-yellow-700",
  COMPLETE: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-200 text-gray-600",
}

const WO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

function deliveryStatus(d: Delivery): { label: string; color: string } {
  if (d.receivedDate && d.receivedCount >= d.itemCount) return { label: "Received", color: "bg-green-100 text-green-700" }
  if (d.receivedDate && d.receivedCount > 0) return { label: "Partial", color: "bg-yellow-100 text-yellow-700" }
  if (!d.receivedDate && new Date(d.expectedDate) < new Date()) return { label: "Overdue", color: "bg-red-100 text-red-700" }
  return { label: "Expected", color: "bg-blue-100 text-blue-700" }
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null)
  const [showReceivingForm, setShowReceivingForm] = useState(false)
  const [receivingDeliveryId, setReceivingDeliveryId] = useState("")
  const [receivedCount, setReceivedCount] = useState("")
  const [damagedCount, setDamagedCount] = useState("")
  const [inspectedBy, setInspectedBy] = useState("")
  const [stagingZone, setStagingZone] = useState("")
  const [receivingNotes, setReceivingNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${id}`)
      const json = await res.json()
      if (json.success) setProject(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const handleReceiving = async () => {
    if (!receivingDeliveryId || !receivedCount) return
    setSubmitting(true)
    try {
      await fetch(`/api/v1/projects/${id}/deliveries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryId: receivingDeliveryId,
          receivedDate: new Date().toISOString(),
          receivedCount: parseInt(receivedCount, 10),
          damagedCount: parseInt(damagedCount, 10) || 0,
          inspectedBy: inspectedBy || null,
          stagingZone: stagingZone || null,
          notes: receivingNotes || null,
        }),
      })
      setShowReceivingForm(false)
      setReceivingDeliveryId("")
      setReceivedCount("")
      setDamagedCount("")
      setInspectedBy("")
      setStagingZone("")
      setReceivingNotes("")
      fetchProject()
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
          </Button>
        </Link>
      </div>
    )
  }

  const receivedPct = project.totalItems > 0 ? Math.round((project.receivedItems / project.totalItems) * 1000) / 10 : 0
  const installedPct = project.totalItems > 0 ? Math.round((project.installedItems / project.totalItems) * 1000) / 10 : 0
  const budgetPct = project.budget && project.budget > 0 ? Math.round(((project.actualCost || 0) / project.budget) * 1000) / 10 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge className={cn("text-xs", STATUS_COLORS[project.status] || "bg-gray-100")}>
              {project.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground ml-8">
            <span className="font-mono">{project.projectNumber}</span>
            <span>·</span>
            <span>{project.client.name}</span>
            {project.location && (
              <>
                <span>·</span>
                <span>{project.location.name} ({project.location.code})</span>
              </>
            )}
            {project.generalContractor && (
              <>
                <span>·</span>
                <span>GC: {project.generalContractor}</span>
              </>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground ml-8 mt-1">{project.description}</p>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Received</span>
              <span className="text-sm font-bold text-green-600">{receivedPct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${receivedPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{project.receivedItems} / {project.totalItems} items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Installed</span>
              <span className="text-sm font-bold text-blue-600">{installedPct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${installedPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{project.installedItems} / {project.totalItems} items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget</span>
              <span className={cn("text-sm font-bold", budgetPct > 100 ? "text-red-600" : "text-amber-600")}>
                {budgetPct}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", budgetPct > 100 ? "bg-red-500" : "bg-amber-500")}
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${((project.actualCost || 0) / 1000).toFixed(1)}K / ${((project.budget || 0) / 1000).toFixed(1)}K
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milestone Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {project.milestones.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No milestones defined</p>
          ) : (
            <div className="relative">
              {project.milestones.map((ms, idx) => {
                const isLast = idx === project.milestones.length - 1
                const isCompleted = ms.status === "COMPLETED"
                const isActive = ms.status === "IN_PROGRESS"
                const target = new Date(ms.targetDate)
                const daysUntil = differenceInDays(target, new Date())

                return (
                  <div key={ms.id} className="flex gap-4 relative">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 z-10 bg-white" />
                      ) : isActive ? (
                        <div className="relative shrink-0 z-10">
                          <Circle className="h-6 w-6 text-blue-500 fill-blue-500" />
                          <div className="absolute inset-0 h-6 w-6 rounded-full bg-blue-400 animate-ping opacity-30" />
                        </div>
                      ) : (
                        <Circle className="h-6 w-6 text-gray-300 shrink-0 z-10 bg-white" />
                      )}
                      {!isLast && (
                        <div className={cn(
                          "w-0.5 flex-1 min-h-[40px]",
                          isCompleted ? "bg-green-300" : "bg-gray-200"
                        )} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={cn("pb-6 flex-1", isLast && "pb-0")}>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium text-sm",
                          isCompleted ? "text-green-700" : isActive ? "text-blue-700" : "text-gray-500"
                        )}>
                          {ms.name}
                        </span>
                        {isCompleted && (
                          <span className="text-xs text-green-600">
                            Completed {ms.completedDate && format(new Date(ms.completedDate), "MMM d")}
                          </span>
                        )}
                        {isActive && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700">In Progress</Badge>
                        )}
                        {!isCompleted && !isActive && (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Target: {format(target, "MMM d, yyyy")}
                        </span>
                        {!isCompleted && (
                          <span className={cn(
                            "font-medium",
                            daysUntil > 0 ? "text-gray-500" : "text-red-500"
                          )}>
                            {daysUntil > 0 ? `${daysUntil}d remaining` : daysUntil === 0 ? "Due today" : `${Math.abs(daysUntil)}d overdue`}
                          </span>
                        )}
                      </div>
                      {ms.description && (
                        <p className="text-xs text-muted-foreground mt-1">{ms.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Deliveries ({project.deliveries.length})</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReceivingForm(!showReceivingForm)}
            >
              <Truck className="h-4 w-4 mr-1" />
              Log Delivery
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Receiving Form */}
          {showReceivingForm && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Confirm Receiving</h4>
                <button onClick={() => setShowReceivingForm(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Delivery</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={receivingDeliveryId}
                  onChange={(e) => setReceivingDeliveryId(e.target.value)}
                >
                  <option value="">Select delivery…</option>
                  {project.deliveries
                    .filter((d) => !d.receivedDate || d.receivedCount < d.itemCount)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.vendorName} — {d.poNumber || "No PO"} ({d.itemCount} items)
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Received Count</label>
                  <Input className="h-8 text-sm mt-1" type="number" value={receivedCount} onChange={(e) => setReceivedCount(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Damaged Count</label>
                  <Input className="h-8 text-sm mt-1" type="number" value={damagedCount} onChange={(e) => setDamagedCount(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Inspected By</label>
                  <Input className="h-8 text-sm mt-1" value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Staging Zone</label>
                  <Input className="h-8 text-sm mt-1" placeholder="e.g. STAGING_A" value={stagingZone} onChange={(e) => setStagingZone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1 resize-none"
                  rows={2}
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={handleReceiving}
                disabled={submitting || !receivingDeliveryId || !receivedCount}
                className="w-full bg-[#ea580c] hover:bg-[#c2410c]"
              >
                <Package className="h-4 w-4 mr-1" />
                {submitting ? "Confirming…" : "Confirm Receiving"}
              </Button>
            </div>
          )}

          {/* Deliveries Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium pr-2" />
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">PO #</th>
                  <th className="pb-2 font-medium">Expected</th>
                  <th className="pb-2 font-medium">Received</th>
                  <th className="pb-2 font-medium text-right">Items</th>
                  <th className="pb-2 font-medium text-right">Damaged</th>
                  <th className="pb-2 font-medium">Staging</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {project.deliveries.map((d) => {
                  const ds = deliveryStatus(d)
                  const isExpanded = expandedDelivery === d.id
                  return (
                    <>
                      <tr
                        key={d.id}
                        className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedDelivery(isExpanded ? null : d.id)}
                      >
                        <td className="py-2.5 pr-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="py-2.5 font-medium">{d.vendorName}</td>
                        <td className="py-2.5 text-muted-foreground font-mono text-xs">{d.poNumber || "—"}</td>
                        <td className="py-2.5 text-xs">{format(new Date(d.expectedDate), "MMM d, yyyy")}</td>
                        <td className="py-2.5 text-xs">{d.receivedDate ? format(new Date(d.receivedDate), "MMM d, yyyy") : "—"}</td>
                        <td className="py-2.5 text-right">{d.receivedCount}/{d.itemCount}</td>
                        <td className="py-2.5 text-right">{d.damagedCount > 0 ? <span className="text-red-600">{d.damagedCount}</span> : "0"}</td>
                        <td className="py-2.5 text-xs">{d.stagingZone || "—"}</td>
                        <td className="py-2.5">
                          <Badge className={cn("text-[10px]", ds.color)}>{ds.label}</Badge>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${d.id}-detail`} className="border-b bg-gray-50">
                          <td colSpan={9} className="py-3 px-4">
                            <div className="text-xs space-y-1">
                              {d.inspectedBy && <p><span className="text-muted-foreground">Inspected by:</span> {d.inspectedBy}</p>}
                              {d.notes && <p><span className="text-muted-foreground">Notes:</span> {d.notes}</p>}
                              {!d.inspectedBy && !d.notes && <p className="text-muted-foreground">No additional details</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {project.deliveries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">No deliveries</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Work Orders ({project.workOrders.length})</CardTitle>
            <Link href="/orders/new">
              <Button size="sm" variant="outline">Create Work Order</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {project.workOrders.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No work orders linked to this project</p>
          ) : (
            <div className="space-y-2">
              {project.workOrders.map((wo) => (
                <Link key={wo.id} href={`/orders/${wo.id}`}>
                  <div className="flex items-center justify-between py-2 px-3 rounded border hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm text-[#ea580c]">{wo.orderNumber}</span>
                      <span className="text-sm text-muted-foreground">{wo.requestType}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {wo.scheduledDate && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(wo.scheduledDate), "MMM d")}
                        </span>
                      )}
                      {wo.totalCost != null && (
                        <span className="text-xs font-medium">${wo.totalCost.toLocaleString()}</span>
                      )}
                      <Badge className={cn("text-[10px]", WO_STATUS_COLORS[wo.status] || "bg-gray-100")}>
                        {wo.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
