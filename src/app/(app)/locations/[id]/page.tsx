"use client"

import { use } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Package, ClipboardList } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const location = trpc.locations.getById.useQuery({ id })

  if (location.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  }
  if (!location.data) {
    return <div className="text-center py-12 text-muted-foreground">Location not found</div>
  }

  const loc = location.data
  const utilization = loc.capacity ? Math.round((loc._count.assets / loc.capacity) * 100) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/locations"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold">{loc.name}</h1>
          <p className="text-sm text-muted-foreground">{loc.city}, {loc.state} {loc.zip || ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Assets</div>
            <div className="text-2xl font-bold mt-1">{loc._count.assets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Capacity</div>
            <div className="text-2xl font-bold mt-1">{loc.capacity || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Utilization</div>
            <div className="text-2xl font-bold mt-1">{utilization !== null ? `${utilization}%` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Partner</div>
            <div className="text-lg font-bold mt-1">{loc.partner?.name || "Corovan Direct"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Location Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{loc.locationType}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Code</span><span>{loc.code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{loc.address || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span>{loc.client?.name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Work Orders (from)</span><span>{loc._count.workOrdersFrom}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Work Orders (to)</span><span>{loc._count.workOrdersTo}</span></div>
          </CardContent>
        </Card>

        {loc.facilities.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Facilities</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loc.facilities.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{f.type || "—"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
