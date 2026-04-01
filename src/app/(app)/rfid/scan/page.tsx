"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ScanLine,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ArrowLeft,
  Radio,
} from "lucide-react"
import Link from "next/link"

interface Location {
  id: string
  name: string
  code: string
  city: string
  state: string
}

interface ScanResult {
  expected: number
  scanned: number
  matched: number
  missing: { tagNumber: string; description: string; rfidTagId: string }[]
  unexpected: string[]
  accuracy: number
}

export default function RfidScanPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState("")
  const [zone, setZone] = useState("")
  const [scannedBy, setScannedBy] = useState("")
  const [scanning, setScanning] = useState(false)
  const [scannedTags, setScannedTags] = useState<string[]>([])
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLocations() {
      try {
        // Get locations from readers endpoint (they have RFID readers)
        const res = await fetch("/api/v1/rfid/readers")
        const json = await res.json()
        if (json.success) {
          const locs = new Map<string, Location>()
          for (const r of json.data) {
            if (!locs.has(r.location.code)) {
              locs.set(r.location.code, {
                id: r.locationId,
                name: r.location.name,
                code: r.location.code,
                city: r.location.city,
                state: r.location.state,
              })
            }
          }
          setLocations([...locs.values()])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [])

  const simulateScan = useCallback(async () => {
    if (!selectedLocation) return
    setScanning(true)
    setScanResult(null)
    setScannedTags([])

    // Simulate scanning tags over 3 seconds
    const loc = locations.find((l) => l.id === selectedLocation)
    if (!loc) {
      setScanning(false)
      return
    }

    // First get expected assets to simulate realistic scanning
    try {
      const previewRes = await fetch("/api/v1/rfid/scan-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocation,
          zone: zone || undefined,
          scannedBy: scannedBy || "Manual Scan",
          tagIds: [],
        }),
      })
      const previewJson = await previewRes.json()

      if (!previewJson.success) {
        setScanning(false)
        return
      }

      // Simulate scanning most expected tags + some extras
      const allMissing = previewJson.data.missing as { rfidTagId: string }[]
      const expectedTagIds = allMissing.map((m) => m.rfidTagId)

      // Scan ~90% of expected tags to create realistic results
      const simulatedTags: string[] = []
      for (const tag of expectedTagIds) {
        if (Math.random() < 0.9) {
          simulatedTags.push(tag)
        }
      }
      // Add a couple of unexpected tags
      for (let i = 0; i < 2; i++) {
        simulatedTags.push(`UNKNOWN_${Math.random().toString(16).slice(2, 10).toUpperCase()}`)
      }

      // Animate tags appearing
      for (let i = 0; i < simulatedTags.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 30))
        setScannedTags((prev) => [...prev, simulatedTags[i]])
      }

      // Now submit the actual scan session
      const res = await fetch("/api/v1/rfid/scan-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocation,
          zone: zone || undefined,
          scannedBy: scannedBy || "Manual Scan",
          tagIds: simulatedTags,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setScanResult(json.data)
      }
    } catch {
      // silent
    } finally {
      setScanning(false)
    }
  }, [selectedLocation, zone, scannedBy, locations])

  const handleExportReport = () => {
    if (!scanResult) return
    const lines = ["Type,Tag Number,Description,RFID Tag ID"]
    for (const m of scanResult.missing) {
      lines.push(`MISSING,${m.tagNumber},${m.description},${m.rfidTagId}`)
    }
    for (const u of scanResult.unexpected) {
      lines.push(`UNEXPECTED,,,${u}`)
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "rfid-scan-discrepancy-report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/rfid" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">RFID Scan Session</h1>
          <p className="text-sm text-muted-foreground">Manual inventory verification scan</p>
        </div>
      </div>

      {/* Location/Zone Selector */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Location</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              disabled={scanning}
            >
              <option value="">Select a location…</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name} ({loc.city}, {loc.state})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Zone (optional)</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="e.g. WAREHOUSE_A"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                disabled={scanning}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Scanned By</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Your name"
                value={scannedBy}
                onChange={(e) => setScannedBy(e.target.value)}
                disabled={scanning}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Scan Button */}
      {!scanResult && (
        <Button
          onClick={simulateScan}
          disabled={!selectedLocation || scanning}
          className={cn(
            "w-full h-20 text-lg font-semibold",
            scanning ? "bg-orange-500" : "bg-[#ea580c] hover:bg-[#c2410c]"
          )}
        >
          {scanning ? (
            <div className="flex items-center gap-3">
              <Radio className="h-6 w-6 animate-pulse" />
              <span>Scanning… {scannedTags.length} tags found</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ScanLine className="h-6 w-6" />
              <span>Start Scan</span>
            </div>
          )}
        </Button>
      )}

      {/* Scanning Animation */}
      {scanning && scannedTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Tags Scanned ({scannedTags.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {scannedTags.map((tag, i) => (
                <div key={i} className="text-xs font-mono py-0.5 px-2 bg-gray-50 rounded">
                  {tag}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResult && (
        <>
          {/* Accuracy */}
          <Card className={cn(
            "border-2",
            scanResult.accuracy >= 95 ? "border-green-300" : scanResult.accuracy >= 80 ? "border-yellow-300" : "border-red-300"
          )}>
            <CardContent className="pt-6 pb-6 text-center">
              <p className={cn(
                "text-6xl font-bold",
                scanResult.accuracy >= 95 ? "text-green-600" : scanResult.accuracy >= 80 ? "text-yellow-600" : "text-red-600"
              )}>
                {scanResult.accuracy}%
              </p>
              <p className="text-muted-foreground mt-1">Scan Accuracy</p>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <p className="text-xl font-bold">{scanResult.expected}</p>
                <p className="text-xs text-muted-foreground">Expected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <p className="text-xl font-bold">{scanResult.scanned}</p>
                <p className="text-xs text-muted-foreground">Scanned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <p className="text-xl font-bold text-green-600">{scanResult.matched}</p>
                <p className="text-xs text-muted-foreground">Matched</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <p className="text-xl font-bold text-red-600">{scanResult.missing.length}</p>
                <p className="text-xs text-muted-foreground">Missing</p>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Report */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Comparison Report</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportReport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export Discrepancy Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Missing Items */}
                {scanResult.missing.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-red-700">
                      <XCircle className="h-4 w-4" />
                      Missing Items ({scanResult.missing.length})
                    </h4>
                    <div className="space-y-1">
                      {scanResult.missing.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 px-2 bg-red-50 rounded text-sm">
                          <span className="font-medium">{m.tagNumber}</span>
                          <span className="text-muted-foreground">{m.description.slice(0, 40)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unexpected Items */}
                {scanResult.unexpected.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-orange-700">
                      <AlertTriangle className="h-4 w-4" />
                      Unexpected Tags ({scanResult.unexpected.length})
                    </h4>
                    <div className="space-y-1">
                      {scanResult.unexpected.map((u, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 px-2 bg-orange-50 rounded text-sm font-mono">
                          {u}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All matched */}
                {scanResult.matched > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Matched Items: {scanResult.matched}
                    </h4>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scan Again */}
          <Button
            onClick={() => { setScanResult(null); setScannedTags([]) }}
            variant="outline"
            className="w-full"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            New Scan
          </Button>
        </>
      )}
    </div>
  )
}
