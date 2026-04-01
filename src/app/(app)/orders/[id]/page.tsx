"use client"

import { use } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns"
import {
  ArrowLeft,
  Mail,
  Printer,
  MessageSquare,
  Clock,
  User,
  MapPin,
  FileText,
  Package,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "border-gray-300 text-gray-600",
  MEDIUM: "border-blue-300 text-blue-600",
  HIGH: "border-orange-300 text-orange-600",
  URGENT: "border-red-400 text-red-600",
}

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const order = trpc.orders.getById.useQuery({ id })
  const [comment, setComment] = useState("")

  if (order.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-60" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (!order.data) {
    return <div className="text-center py-12 text-muted-foreground">Work order not found</div>
  }

  const wo = order.data

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{wo.orderNumber}</h1>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[wo.status])}>
                {wo.status.replace(/_/g, " ")}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[wo.priority])}>
                {wo.priority}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{wo.jobName || wo.requestType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5 mr-1" /> Email</Button>
          <Button variant="outline" size="sm"><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
          {(wo.status === "PENDING_APPROVAL" || wo.status === "DRAFT") && (
            <Button size="sm">Approve</Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Request Details */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
              <CardTitle className="text-sm font-medium">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Request Type" value={wo.requestType} />
                <Field label="Category" value={wo.requestCategory || "—"} />
                <Field label="Job Name" value={wo.jobName || "—"} />
                <Field label="Partner" value={wo.partner?.name || "Corovan Direct"} />
                <div className="col-span-2">
                  <Field label="Description" value={wo.description || "—"} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
              <CardTitle className="text-sm font-medium">Billing Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <Field label="PO Number" value={wo.poNumber || "—"} />
                <Field label="Cost Center" value={wo.costCenter || "—"} />
                <Field label="Department" value={wo.department || "—"} />
                <Field label="GL Code" value={wo.glCode || "—"} />
                <Field label="Charge Back" value={wo.chargeBack || "—"} />
                <Field label="Work Order Ref" value={wo.workOrderRef || "—"} />
              </div>
            </CardContent>
          </Card>

          {/* Job Site */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> Job Site
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">FROM</div>
                  <div className="font-medium">{wo.fromLocation?.name || "—"}</div>
                  <div className="text-muted-foreground">
                    {wo.fromLocation?.city}, {wo.fromLocation?.state}
                  </div>
                  {wo.fromDetail && <div className="text-muted-foreground mt-1">{wo.fromDetail}</div>}
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">TO</div>
                  <div className="font-medium">{wo.toLocation?.name || "—"}</div>
                  <div className="text-muted-foreground">
                    {wo.toLocation?.city}, {wo.toLocation?.state}
                  </div>
                  {wo.toDetail && <div className="text-muted-foreground mt-1">{wo.toDetail}</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Items */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-3.5 w-3.5" /> Inventory Items ({wo.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2">Tag #</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Qty</th>
                    <th className="px-4 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.items.map((item, idx) => (
                    <tr key={item.id} className={cn("border-b", idx % 2 === 1 && "bg-muted/20")}>
                      <td className="px-4 py-2 font-mono text-primary">{item.asset.tagNumber}</td>
                      <td className="px-4 py-2">{item.asset.description}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2 text-muted-foreground">{item.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 mb-4">
                {wo.logs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium",
                        log.type === "COMMENT" ? "bg-blue-100 text-blue-600" :
                        log.type === "STATUS_CHANGE" ? "bg-orange-100 text-orange-600" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {log.user?.name?.[0] || "S"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs">{log.user?.name || "System"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{log.title}</div>
                      {log.text && <p className="text-xs mt-0.5">{log.text}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
                <Button size="sm" disabled={!comment.trim()} className="self-end">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* People */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> People
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Requested By</div>
                <div className="font-medium">{wo.requestedBy}</div>
                {wo.requestedByEmail && (
                  <a href={`mailto:${wo.requestedByEmail}`} className="text-xs text-primary hover:underline">{wo.requestedByEmail}</a>
                )}
              </div>
              {wo.onsiteContact && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Onsite Contact</div>
                  <div className="font-medium">{wo.onsiteContact}</div>
                  {wo.onsitePhone && <div className="text-xs text-muted-foreground">{wo.onsitePhone}</div>}
                </div>
              )}
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Created By</div>
                <div className="font-medium">{wo.createdBy.name}</div>
                <a href={`mailto:${wo.createdBy.email}`} className="text-xs text-primary hover:underline">{wo.createdBy.email}</a>
              </div>
            </CardContent>
          </Card>

          {/* SLA Compliance */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" /> SLA Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SlaRow
                label="Response"
                deadline={wo.slaResponseDue}
                completedAt={wo.respondedAt}
                orderStatus={wo.status}
              />
              <SlaRow
                label="Completion"
                deadline={wo.slaCompletionDue}
                completedAt={wo.completedDate}
                orderStatus={wo.status}
              />
              {wo.checkedInAt && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Navigation className="h-3 w-3 text-green-600" />
                    <span className="font-medium">Checked In</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(wo.checkedInAt), "MMM d, yyyy h:mm a")}
                  </div>
                  {wo.checkedInLat && wo.checkedInLng && (
                    <div className="text-[10px] text-muted-foreground">
                      GPS: {Number(wo.checkedInLat).toFixed(4)}, {Number(wo.checkedInLng).toFixed(4)}
                    </div>
                  )}
                </div>
              )}
              {wo.checkedOutAt && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-blue-600" />
                    <span className="font-medium">Checked Out</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(wo.checkedOutAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          {(wo.totalCost || wo.actualHours || wo.nteAmount) && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5" /> Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {wo.actualHours != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Hours</span>
                    <span className="text-xs font-medium">{wo.actualHours}h @ ${wo.laborRate || 85}/hr</span>
                  </div>
                )}
                {wo.materialCost != null && wo.materialCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Materials</span>
                    <span className="text-xs font-medium">${wo.materialCost.toLocaleString()}</span>
                  </div>
                )}
                {wo.totalCost != null && (
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-muted-foreground text-xs font-medium">Total</span>
                    <span className="text-xs font-bold">${wo.totalCost.toLocaleString()}</span>
                  </div>
                )}
                {wo.nteAmount != null && (
                  <div className={cn("flex justify-between", wo.totalCost && wo.totalCost > wo.nteAmount ? "text-red-600" : "")}>
                    <span className="text-xs">NTE</span>
                    <span className="text-xs font-medium">${wo.nteAmount.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DateRow label="Requested" date={wo.requestDate} />
              <DateRow label="Scheduled" date={wo.scheduledDate} />
              <DateRow label="Completed" date={wo.completedDate} />
              <DateRow label="Created" date={wo.createdAt} />
              <DateRow label="Updated" date={wo.updatedAt} />
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" /> Attachments ({wo.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wo.attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attachments</p>
              ) : (
                <div className="space-y-1">
                  {wo.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{att.fileName}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                Upload Attachment
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Notifications ({wo.notifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wo.notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notification recipients</p>
              ) : (
                <div className="space-y-1">
                  {wo.notifications.map((n) => (
                    <div key={n.id} className="text-xs">{n.email}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function SlaRow({ label, deadline, completedAt, orderStatus }: {
  label: string
  deadline: Date | string | null | undefined
  completedAt: Date | string | null | undefined
  orderStatus: string
}) {
  if (!deadline) return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">Not set</span>
    </div>
  )

  const due = new Date(deadline)
  const now = new Date()
  const met = !!completedAt && new Date(completedAt) <= due

  if (completedAt) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {met ? (
            <><CheckCircle2 className="h-3 w-3 text-green-600" /><span className="text-xs text-green-700 font-medium">Met</span></>
          ) : (
            <><AlertTriangle className="h-3 w-3 text-red-600" /><span className="text-xs text-red-600 font-medium">Breached</span></>
          )}
        </div>
      </div>
    )
  }

  if (orderStatus === "CANCELLED" || orderStatus === "DRAFT") {
    return (
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">—</span>
      </div>
    )
  }

  const minsLeft = differenceInMinutes(due, now)

  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {minsLeft < 0 ? (
          <><AlertTriangle className="h-3 w-3 text-red-600" /><span className="text-[10px] text-red-600 font-semibold">OVERDUE {formatDistanceToNow(due)}</span></>
        ) : minsLeft < 120 ? (
          <><Clock className="h-3 w-3 text-orange-500" /><span className="text-[10px] text-orange-600 font-medium">{formatDistanceToNow(due, { addSuffix: true })}</span></>
        ) : (
          <><Clock className="h-3 w-3 text-green-500" /><span className="text-[10px] text-green-700">{formatDistanceToNow(due, { addSuffix: true })}</span></>
        )}
      </div>
    </div>
  )
}

function DateRow({ label, date }: { label: string; date: Date | string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs font-medium">
        {date ? format(new Date(date), "MMM d, yyyy") : "—"}
      </span>
    </div>
  )
}
