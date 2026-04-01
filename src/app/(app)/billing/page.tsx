"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { DollarSign, FileText, Hash, ChevronDown, ChevronRight, Download, Check } from "lucide-react"
import Link from "next/link"

interface WorkOrder {
  id: string
  orderNumber: string
  clientName: string
  jobName: string | null
  partnerName: string | null
  completedDate: string | null
  actualHours: number | null
  totalCost: number
  nteAmount: number | null
  invoiceNumber: string | null
  invoicedAt: string | null
}

interface InvoiceGroup {
  invoiceNumber: string
  invoicedAt: string
  clientName: string
  orders: WorkOrder[]
  total: number
}

export default function BillingPage() {
  const [tab, setTab] = useState("unbilled")
  const [unbilled, setUnbilled] = useState<WorkOrder[]>([])
  const [invoiced, setInvoiced] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/billing/export?format=json")
      if (res.ok) {
        const data = await res.json()
        const all: WorkOrder[] = data.workOrders ?? data ?? []
        setUnbilled(all.filter((wo: WorkOrder) => wo.invoiceNumber == null))
        setInvoiced(all.filter((wo: WorkOrder) => wo.invoiceNumber != null))
      }
    } catch {
      // API not yet available — use empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === unbilled.length) setSelected(new Set())
    else setSelected(new Set(unbilled.map((wo) => wo.id)))
  }

  const handleGenerateInvoice = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/v1/billing/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: Array.from(selected) }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuccessMsg(`Invoice ${data.invoiceNumber} generated successfully`)
        setSelected(new Set())
        fetchData()
      }
    } catch {
      // handle silently
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async (fmt: string) => {
    setExportOpen(false)
    window.open(`/api/v1/billing/export?format=${fmt}`, "_blank")
  }

  // Summary cards
  const totalUnbilled = unbilled.reduce((s, wo) => s + wo.totalCost, 0)
  const avgValue = unbilled.length > 0 ? totalUnbilled / unbilled.length : 0

  // Group invoiced by invoiceNumber
  const invoiceGroups: InvoiceGroup[] = []
  const groupMap = new Map<string, InvoiceGroup>()
  for (const wo of invoiced) {
    if (!wo.invoiceNumber) continue
    let group = groupMap.get(wo.invoiceNumber)
    if (!group) {
      group = {
        invoiceNumber: wo.invoiceNumber,
        invoicedAt: wo.invoicedAt || "",
        clientName: wo.clientName,
        orders: [],
        total: 0,
      }
      groupMap.set(wo.invoiceNumber, group)
      invoiceGroups.push(group)
    }
    group.orders.push(wo)
    group.total += wo.totalCost
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage invoicing and billing for completed work orders</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="unbilled">Unbilled</TabsTrigger>
          <TabsTrigger value="invoiced">Invoiced</TabsTrigger>
        </TabsList>

        <TabsContent value="unbilled">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-orange-100 p-2"><DollarSign className="h-5 w-5 text-orange-600" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Unbilled</div>
                  <div className="text-xl font-bold">{formatCurrency(totalUnbilled)}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-blue-100 p-2"><Hash className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Unbilled Count</div>
                  <div className="text-xl font-bold">{unbilled.length}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-green-100 p-2"><FileText className="h-5 w-5 text-green-600" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Avg Value</div>
                  <div className="text-xl font-bold">{formatCurrency(avgValue)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Success Alert */}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 mb-4">
              <Check className="h-4 w-4" />
              {successMsg}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selected` : "Select work orders to invoice"}
            </span>
            <Button disabled={selected.size === 0 || generating} onClick={handleGenerateInvoice}>
              {generating ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>

          {/* Unbilled Table */}
          <div className="rounded-lg border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={unbilled.length > 0 && selected.size === unbilled.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Order #</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Partner</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">Hours</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                  <th className="px-3 py-2 font-medium text-right">NTE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : unbilled.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No unbilled work orders</td></tr>
                ) : (
                  unbilled.map((wo, idx) => {
                    const overNte = wo.nteAmount != null && wo.totalCost > wo.nteAmount
                    return (
                      <tr
                        key={wo.id}
                        className={cn("border-b hover:bg-muted/30 transition-colors", idx % 2 === 1 && "bg-muted/10")}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(wo.id)}
                            onChange={() => toggleSelect(wo.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/orders/${wo.id}`} className="font-medium text-primary hover:underline">
                            {wo.orderNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">{wo.clientName}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{wo.jobName || "—"}</td>
                        <td className="px-3 py-2.5 text-xs">{wo.partnerName || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {wo.completedDate ? format(new Date(wo.completedDate), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">{wo.actualHours ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(wo.totalCost)}</td>
                        <td className={cn("px-3 py-2.5 text-right", overNte && "text-red-600 font-semibold")}>
                          {wo.nteAmount != null ? formatCurrency(wo.nteAmount) : "—"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="invoiced">
          {/* Export Dropdown */}
          <div className="flex justify-end mb-4 relative">
            <div className="relative">
              <Button variant="outline" onClick={() => setExportOpen(!exportOpen)}>
                <Download className="h-4 w-4 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-md border bg-background shadow-lg">
                  {[
                    { key: "csv", label: "CSV" },
                    { key: "corrigo", label: "Corrigo Format" },
                    { key: "cbre", label: "CBRE Format" },
                    { key: "cw", label: "C&W Format" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleExport(opt.key)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invoiced Table */}
          <div className="rounded-lg border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 font-medium">Invoice #</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium text-center">Orders</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : invoiceGroups.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No invoiced work orders</td></tr>
                ) : (
                  invoiceGroups.map((group) => {
                    const isExpanded = expandedInvoice === group.invoiceNumber
                    return (
                      <tbody key={group.invoiceNumber}>
                        <tr
                          className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setExpandedInvoice(isExpanded ? null : group.invoiceNumber)}
                        >
                          <td className="px-3 py-2.5">
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          </td>
                          <td className="px-3 py-2.5 font-medium">{group.invoiceNumber}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {group.invoicedAt ? format(new Date(group.invoicedAt), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-3 py-2.5">{group.clientName}</td>
                          <td className="px-3 py-2.5 text-center">{group.orders.length}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(group.total)}</td>
                        </tr>
                        {isExpanded && group.orders.map((wo) => (
                          <tr key={wo.id} className="border-b bg-muted/20">
                            <td></td>
                            <td className="px-3 py-2 text-xs" colSpan={2}>
                              <Link href={`/orders/${wo.id}`} className="text-primary hover:underline">{wo.orderNumber}</Link>
                            </td>
                            <td className="px-3 py-2 text-xs">{wo.jobName || "—"}</td>
                            <td className="px-3 py-2 text-xs text-center">{wo.actualHours ?? "—"}h</td>
                            <td className="px-3 py-2 text-xs text-right">{formatCurrency(wo.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
