"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Search, MapPin } from "lucide-react"
import Link from "next/link"

export default function LocationsPage() {
  const [type, setType] = useState("ALL")
  const [search, setSearch] = useState("")

  const locations = trpc.locations.list.useQuery({
    type: type === "ALL" ? undefined : type,
    search: search || undefined,
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Locations</h1>
        <p className="text-sm text-muted-foreground">Manage client locations across the network</p>
      </div>

      <Tabs value={type} onValueChange={setType}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="ALL">All ({locations.data?.length || 0})</TabsTrigger>
            <TabsTrigger value="PRIMARY">Primary Offices</TabsTrigger>
            <TabsTrigger value="BRANCH">Branches</TabsTrigger>
            <TabsTrigger value="WAREHOUSE">Warehouses</TabsTrigger>
          </TabsList>
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </Tabs>

      <div className="rounded-lg border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 font-medium">City</th>
              <th className="px-4 py-2 font-medium">State</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Assets</th>
              <th className="px-4 py-2 font-medium">Capacity</th>
              <th className="px-4 py-2 font-medium">Utilization</th>
              <th className="px-4 py-2 font-medium">Partner</th>
            </tr>
          </thead>
          <tbody>
            {locations.data?.map((loc, idx) => {
              const utilization = loc.capacity ? Math.round((loc._count.assets / loc.capacity) * 100) : null
              return (
                <tr key={loc.id} className={cn("border-b hover:bg-muted/30", idx % 2 === 1 && "bg-muted/10")}>
                  <td className="px-4 py-2.5">
                    <Link href={`/locations/${loc.id}`} className="font-medium text-primary hover:underline flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {loc.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{loc.city}</td>
                  <td className="px-4 py-2.5">{loc.state}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      loc.locationType === "PRIMARY" ? "bg-blue-100 text-blue-700" :
                      loc.locationType === "BRANCH" ? "bg-gray-100 text-gray-700" :
                      "bg-purple-100 text-purple-700"
                    )}>
                      {loc.locationType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{loc._count.assets}</td>
                  <td className="px-4 py-2.5">{loc.capacity || "—"}</td>
                  <td className="px-4 py-2.5">
                    {utilization !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              utilization < 65 ? "bg-green-500" :
                              utilization < 85 ? "bg-yellow-500" :
                              "bg-red-500"
                            )}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{utilization}%</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{loc.partner?.name || "Corovan Direct"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
