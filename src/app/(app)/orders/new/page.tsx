"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, X } from "lucide-react"
import Link from "next/link"

const REQUEST_TYPES: Record<string, string[]> = {
  Storage: ["Storage-In", "Storage-Out", "Inventory Count"],
  Move: ["Furniture Move", "Office Move", "Inter-Office Move"],
  Reconfigure: ["Install", "Disassemble", "Reconfigure"],
  Event: ["Event Setup", "Event Breakdown"],
  "Walk-Through": ["Site Survey", "Inspection"],
  Supplies: ["Packing Materials", "Moving Supplies"],
}

export default function NewWorkOrderPage() {
  const router = useRouter()
  const locations = trpc.locations.list.useQuery({})
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (order) => {
      router.push(`/orders/${order.id}`)
    },
  })

  const [form, setForm] = useState({
    requestType: "",
    requestCategory: "",
    priority: "MEDIUM",
    requestedBy: "",
    requestedByEmail: "",
    onsiteContact: "",
    onsitePhone: "",
    jobName: "",
    autoJobName: true,
    description: "",
    fromLocationId: "",
    toLocationId: "",
    fromDetail: "",
    toDetail: "",
    poNumber: "",
    costCenter: "",
    department: "",
    glCode: "",
    chargeBack: "",
    workOrderRef: "",
    scheduledDate: "",
    requireApproval: true,
  })

  const [notificationEmails, setNotificationEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState("")

  const categories = form.requestType ? REQUEST_TYPES[form.requestType] || [] : []

  const autoJobName = form.autoJobName && form.requestType
    ? `${form.requestType}${form.requestCategory ? ` - ${form.requestCategory}` : ""}`
    : form.jobName

  const selectedFromLocation = locations.data?.find((l) => l.id === form.fromLocationId)
  const partnerName = selectedFromLocation?.partner?.name || (form.fromLocationId ? "Corovan Direct" : null)

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addEmail = () => {
    if (newEmail && !notificationEmails.includes(newEmail)) {
      setNotificationEmails([...notificationEmails, newEmail])
      setNewEmail("")
    }
  }

  const handleSubmit = () => {
    // In demo mode, use first available client/user
    createOrder.mutate({
      clientId: "demo", // Will need actual client ID
      requestType: form.requestType,
      requestCategory: form.requestCategory || undefined,
      priority: form.priority as any,
      requestedBy: form.requestedBy || "Demo User",
      requestedByEmail: form.requestedByEmail || undefined,
      onsiteContact: form.onsiteContact || undefined,
      onsitePhone: form.onsitePhone || undefined,
      createdById: "demo", // Will need actual user ID
      jobName: autoJobName || undefined,
      description: form.description || undefined,
      fromLocationId: form.fromLocationId || undefined,
      toLocationId: form.toLocationId || undefined,
      fromDetail: form.fromDetail || undefined,
      toDetail: form.toDetail || undefined,
      poNumber: form.poNumber || undefined,
      costCenter: form.costCenter || undefined,
      department: form.department || undefined,
      glCode: form.glCode || undefined,
      chargeBack: form.chargeBack || undefined,
      workOrderRef: form.workOrderRef || undefined,
      scheduledDate: form.scheduledDate || undefined,
      requireApproval: form.requireApproval,
      notificationEmails: notificationEmails.length ? notificationEmails : undefined,
    })
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Work Order</h1>
          <p className="text-sm text-muted-foreground">Create a new furniture request</p>
        </div>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
          <CardTitle className="text-sm font-medium">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Request Type *</Label>
              <Select
                value={form.requestType}
                onChange={(e) => {
                  updateField("requestType", e.target.value)
                  updateField("requestCategory", "")
                }}
              >
                <option value="">Select type...</option>
                {Object.keys(REQUEST_TYPES).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={form.requestCategory}
                onChange={(e) => updateField("requestCategory", e.target.value)}
                disabled={!form.requestType}
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onChange={(e) => updateField("priority", e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-xs">Job Name</Label>
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.autoJobName}
                    onChange={(e) => updateField("autoJobName", e.target.checked)}
                    className="rounded"
                  />
                  Auto-generate
                </label>
              </div>
              <Input
                value={form.autoJobName ? autoJobName : form.jobName}
                onChange={(e) => updateField("jobName", e.target.value)}
                disabled={form.autoJobName}
                placeholder="Job name..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Requested By *</Label>
              <Input
                value={form.requestedBy}
                onChange={(e) => updateField("requestedBy", e.target.value)}
                placeholder="Name..."
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                value={form.requestedByEmail}
                onChange={(e) => updateField("requestedByEmail", e.target.value)}
                placeholder="Email..."
                type="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Onsite Contact</Label>
              <Input
                value={form.onsiteContact}
                onChange={(e) => updateField("onsiteContact", e.target.value)}
                placeholder="Contact name..."
              />
            </div>
            <div>
              <Label className="text-xs">Onsite Phone</Label>
              <Input
                value={form.onsitePhone}
                onChange={(e) => updateField("onsitePhone", e.target.value)}
                placeholder="Phone..."
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the request..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
          <CardTitle className="text-sm font-medium">Billing Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { field: "poNumber", label: "PO Number" },
              { field: "costCenter", label: "Cost Center" },
              { field: "department", label: "Department" },
              { field: "glCode", label: "GL Code" },
              { field: "chargeBack", label: "Charge Back #" },
              { field: "workOrderRef", label: "Work Order #" },
            ].map(({ field, label }) => (
              <div key={field}>
                <Label className="text-xs">{label}</Label>
                <Input
                  value={(form as any)[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  maxLength={35}
                  placeholder={label}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Site */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
          <CardTitle className="text-sm font-medium">Job Site</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">From Location</Label>
                <Select
                  value={form.fromLocationId}
                  onChange={(e) => updateField("fromLocationId", e.target.value)}
                >
                  <option value="">Select location...</option>
                  {locations.data && (
                    <>
                      <optgroup label="Primary Offices">
                        {locations.data.filter((l) => l.locationType === "PRIMARY").map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Branch Offices">
                        {locations.data.filter((l) => l.locationType === "BRANCH").map((l) => (
                          <option key={l.id} value={l.id}>{l.name} ({l.state})</option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </Select>
              </div>
              <div>
                <Label className="text-xs">From Detail</Label>
                <Input
                  value={form.fromDetail}
                  onChange={(e) => updateField("fromDetail", e.target.value)}
                  placeholder="Building, floor, room..."
                />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">To Location</Label>
                <Select
                  value={form.toLocationId}
                  onChange={(e) => updateField("toLocationId", e.target.value)}
                >
                  <option value="">Select location...</option>
                  {locations.data && (
                    <>
                      <optgroup label="Primary Offices">
                        {locations.data.filter((l) => l.locationType === "PRIMARY").map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Branch Offices">
                        {locations.data.filter((l) => l.locationType === "BRANCH").map((l) => (
                          <option key={l.id} value={l.id}>{l.name} ({l.state})</option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </Select>
              </div>
              <div>
                <Label className="text-xs">To Detail</Label>
                <Input
                  value={form.toDetail}
                  onChange={(e) => updateField("toDetail", e.target.value)}
                  placeholder="Building, floor, room..."
                />
              </div>
            </div>
          </div>
          {partnerName && (
            <div className="mt-3 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
              This order will be fulfilled by <span className="font-semibold text-primary">{partnerName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Date */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Scheduled Date</Label>
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => updateField("scheduledDate", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white py-2 px-4 rounded-t-lg">
          <CardTitle className="text-sm font-medium">Additional Notifications</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex gap-2 mb-3">
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email address..."
              type="email"
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <Button variant="outline" size="sm" onClick={addEmail}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {notificationEmails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {notificationEmails.map((email) => (
                <span key={email} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {email}
                  <button onClick={() => setNotificationEmails(notificationEmails.filter((e) => e !== email))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-lg border bg-background p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requireApproval}
            onChange={(e) => updateField("requireApproval", e.target.checked)}
            className="rounded"
          />
          Request Approval On Submit
        </label>
        <div className="flex gap-2">
          <Link href="/orders">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={!form.requestType || !form.requestedBy || createOrder.isPending}>
            {createOrder.isPending ? "Saving..." : "Save Work Order"}
          </Button>
        </div>
      </div>
    </div>
  )
}
