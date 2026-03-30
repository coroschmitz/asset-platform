"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface LocationPoint {
  id: string
  name: string
  city: string
  state: string
  lat: number
  lng: number
  type: string
  partnerName: string
  assetCount: number
  capacity: number | null
}

export function NationalMap({ locations }: { locations: LocationPoint[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <MapPlaceholder locations={locations} />
  }

  return <LeafletMap locations={locations} />
}

function LeafletMap({ locations }: { locations: LocationPoint[] }) {
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [components, setComponents] = useState<any>(null)

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    Promise.all([
      import("react-leaflet"),
      import("leaflet/dist/leaflet.css"),
      import("leaflet"),
    ]).then(([rl, , L]) => {
      setComponents({ rl, L: L.default || L })
      setLeafletLoaded(true)
    }).catch(() => {
      // Fallback silently
    })
  }, [])

  if (!leafletLoaded || !components) {
    return <MapPlaceholder locations={locations} />
  }

  const { rl, L } = components
  const { MapContainer, TileLayer, CircleMarker, Popup } = rl

  return (
    <div className="relative">
      <MapContainer
        center={[39.0, -98.0]}
        zoom={4}
        scrollWheelZoom={true}
        style={{ height: "420px", width: "100%", borderRadius: "0.5rem" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => {
          const isCorovan = loc.partnerName.includes("Corovan")
          const isPrimary = loc.type === "PRIMARY"
          const radius = isPrimary ? 8 : 4
          const color = isCorovan ? "#ea580c" : "#7c3aed"
          const utilization = loc.capacity ? Math.round((loc.assetCount / loc.capacity) * 100) : null

          return (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={radius}
              pathOptions={{
                color: "white",
                weight: isPrimary ? 2 : 1,
                fillColor: color,
                fillOpacity: isPrimary ? 0.9 : 0.7,
              }}
            >
              <Popup>
                <div style={{ fontFamily: "sans-serif", fontSize: "12px", lineHeight: "1.5", minWidth: "160px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>{loc.name}</div>
                  <div style={{ color: "#555" }}>{loc.city}, {loc.state}</div>
                  <div style={{ marginTop: "6px", borderTop: "1px solid #eee", paddingTop: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Partner</span>
                      <span style={{ fontWeight: 500 }}>{loc.partnerName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Assets</span>
                      <span style={{ fontWeight: 500 }}>{loc.assetCount.toLocaleString()}</span>
                    </div>
                    {utilization !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#888" }}>Utilization</span>
                        <span style={{ fontWeight: 500, color: utilization > 85 ? "#dc2626" : utilization > 65 ? "#d97706" : "#059669" }}>
                          {utilization}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        backgroundColor: isCorovan ? "#fff7ed" : "#f5f3ff",
                        color: isCorovan ? "#ea580c" : "#7c3aed",
                        fontWeight: 600,
                      }}
                    >
                      {isCorovan ? "Corovan Direct" : "Partner Network"}
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white/95 backdrop-blur-sm border shadow-sm px-3 py-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Coverage</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-full bg-[#ea580c] border border-white shadow-sm" />
            <span>Corovan Direct (CA)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-full bg-[#7c3aed] border border-white shadow-sm" />
            <span>Partner Network</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          <span>Larger = Primary Office</span>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-[1000] rounded-lg bg-white/95 backdrop-blur-sm border shadow-sm px-3 py-2 text-xs">
        <div className="font-semibold">{locations.length} Locations</div>
        <div className="text-muted-foreground">
          {locations.filter((l) => l.type === "PRIMARY").length} Primary &middot;{" "}
          {locations.filter((l) => l.type === "BRANCH").length} Branches
        </div>
        <div className="text-muted-foreground">
          {new Set(locations.map((l) => l.state)).size} States
        </div>
      </div>
    </div>
  )
}

function MapPlaceholder({ locations }: { locations: LocationPoint[] }) {
  const stateGroups: Record<string, { count: number; assets: number }> = {}
  for (const loc of locations) {
    if (!stateGroups[loc.state]) stateGroups[loc.state] = { count: 0, assets: 0 }
    stateGroups[loc.state].count++
    stateGroups[loc.state].assets += loc.assetCount
  }

  return (
    <div className="relative h-[420px] rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 border overflow-hidden flex items-center justify-center">
      <div className="text-center space-y-3 p-6">
        <div className="text-sm font-medium">Loading Map...</div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(stateGroups).sort((a, b) => b[1].assets - a[1].assets).map(([state, data]) => (
            <div key={state} className="text-left rounded-md border bg-white p-2">
              <div className="font-bold text-sm">{state}</div>
              <div className="text-[10px] text-muted-foreground">{data.count} locations</div>
              <div className="text-[10px] text-muted-foreground">{data.assets.toLocaleString()} assets</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
