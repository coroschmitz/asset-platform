"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MapPin, ClipboardList, Shield, Server, Mail, Phone, User } from "lucide-react"
import Link from "next/link"

export default function PartnersPage() {
  const partners = trpc.partners.list.useQuery()

  const totalLocations = partners.data?.reduce((sum, p) => sum + p._count.locations, 0) || 0
  const totalOrders = partners.data?.reduce((sum, p) => sum + p._count.workOrders, 0) || 0
  const allStates = new Set(partners.data?.flatMap((p) => p.states) || [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Partner Network</h1>
        <p className="text-sm text-muted-foreground">
          Corovan National Partner Network &mdash; {partners.data?.length || 0} Partners Across {allStates.size} States
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold">{partners.data?.length || 0}</div><div className="text-[10px] text-muted-foreground">Partners</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold">{allStates.size}</div><div className="text-[10px] text-muted-foreground">States</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold">{totalLocations}</div><div className="text-[10px] text-muted-foreground">Locations</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold">{totalOrders}</div><div className="text-[10px] text-muted-foreground">Work Orders</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.data?.map((partner) => (
          <Link key={partner.id} href={`/partners/${partner.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{partner.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {partner.name.includes("Corovan") ? "Direct" : "Partner"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{partner.region}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{partner._count.locations} locations</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>{partner._count.workOrders} orders</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">States:</span>
                    <div className="flex gap-1">
                      {partner.states.map((s) => (
                        <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs">SLA Target: {partner.slaTarget}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{partner.warehouseSystem}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      partner.apiEndpoint ? "bg-green-500" : partner.isActive ? "bg-yellow-500" : "bg-gray-300"
                    )} />
                    <span className="text-[10px] text-muted-foreground">
                      {partner.apiEndpoint ? "Connected" : partner.isActive ? "Pending Integration" : "Offline"}
                    </span>
                  </div>

                  {/* Contact Info */}
                  {partner.contactName && (
                    <div className="border-t pt-2 mt-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{partner.contactName}</span>
                      </div>
                      {partner.contactEmail && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{partner.contactEmail}</span>
                        </div>
                      )}
                      {partner.contactPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{partner.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
