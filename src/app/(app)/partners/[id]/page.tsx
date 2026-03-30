"use client"

import { use } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
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

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const partner = trpc.partners.getById.useQuery({ id })

  if (partner.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  }
  if (!partner.data) return <div className="text-center py-12 text-muted-foreground">Partner not found</div>

  const p = partner.data

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/partners"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">{p.region} &mdash; {p.states.join(", ")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Locations</div><div className="text-2xl font-bold mt-1">{p.locations.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Work Orders</div><div className="text-2xl font-bold mt-1">{p.workOrders.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">SLA Target</div><div className="text-2xl font-bold mt-1">{p.slaTarget}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">System</div><div className="text-lg font-bold mt-1">{p.warehouseSystem}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            {p.contactName && <div className="flex items-center gap-2"><span className="font-medium">{p.contactName}</span></div>}
            {p.contactEmail && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><a href={`mailto:${p.contactEmail}`} className="text-primary hover:underline">{p.contactEmail}</a></div>}
            {p.contactPhone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{p.contactPhone}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Service Locations ({p.locations.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {p.locations.map((loc) => (
                <div key={loc.id} className="flex items-center justify-between text-sm border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{loc.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{loc._count.assets} assets</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent Work Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">Order #</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Status</th>
            </tr></thead>
            <tbody>
              {p.workOrders.map((wo, idx) => (
                <tr key={wo.id} className={cn("border-b", idx % 2 === 1 && "bg-muted/10")}>
                  <td className="px-4 py-2"><Link href={`/orders/${wo.id}`} className="text-primary hover:underline">{wo.orderNumber}</Link></td>
                  <td className="px-4 py-2 text-xs">{format(new Date(wo.createdAt), "MMM d, yyyy")}</td>
                  <td className="px-4 py-2">{wo.requestType}</td>
                  <td className="px-4 py-2 text-xs">{wo.fromLocation?.city}, {wo.fromLocation?.state}</td>
                  <td className="px-4 py-2"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLORS[wo.status])}>{wo.status.replace(/_/g, " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
