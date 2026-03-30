"use client"

import { useEffect, useRef, useState } from "react"

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
  const mapContainer = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<any>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return

    let cancelled = false

    import("mapbox-gl").then((mapboxgl) => {
      if (cancelled || !mapContainer.current) return

      mapboxgl.default.accessToken = token

      const map = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-98.5, 38.5],
        zoom: 3.5,
      })

      map.on("load", () => {
        setMapLoaded(true)
        mapRef.current = map

        for (const loc of locations) {
          const isCorovan = loc.partnerName.includes("Corovan")
          const isPrimary = loc.type === "PRIMARY"
          const size = isPrimary ? 12 : 6

          const el = document.createElement("div")
          el.style.width = `${size}px`
          el.style.height = `${size}px`
          el.style.borderRadius = "50%"
          el.style.backgroundColor = isCorovan ? "#ea580c" : "#7c3aed"
          el.style.border = "2px solid white"
          el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)"
          el.style.cursor = "pointer"

          const popup = new mapboxgl.default.Popup({ offset: 10 }).setHTML(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong>${loc.name}</strong><br/>
              ${loc.city}, ${loc.state}<br/>
              <span style="color: #666;">Partner: ${loc.partnerName}</span><br/>
              <span style="color: #666;">Assets: ${loc.assetCount}</span>
              ${loc.capacity ? `<br/><span style="color: #666;">Capacity: ${Math.round((loc.assetCount / loc.capacity) * 100)}%</span>` : ""}
            </div>
          `)

          new mapboxgl.default.Marker(el)
            .setLngLat([loc.lng, loc.lat])
            .setPopup(popup)
            .addTo(map)
        }
      })

      map.addControl(new mapboxgl.default.NavigationControl(), "top-right")
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [token, locations])

  if (!token) {
    return (
      <div className="relative h-80 rounded-lg bg-gradient-to-br from-blue-50 to-green-50 border overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Map Preview</div>
            <div className="text-xs text-muted-foreground">Set NEXT_PUBLIC_MAPBOX_TOKEN to enable interactive map</div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {locations.slice(0, 12).map((loc) => (
                <span
                  key={loc.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: loc.partnerName.includes("Corovan") ? "#ea580c" : "#7c3aed" }}
                  />
                  {loc.city}, {loc.state} ({loc.assetCount})
                </span>
              ))}
              {locations.length > 12 && (
                <span className="text-[10px] text-muted-foreground">+{locations.length - 12} more</span>
              )}
            </div>
            <div className="flex gap-4 justify-center text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#ea580c]" /> Corovan Direct
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#7c3aed]" /> Partner Network
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={mapContainer} className="h-80 rounded-lg overflow-hidden" />
  )
}
