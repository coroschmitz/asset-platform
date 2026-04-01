"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Upload,
  FileSpreadsheet,
  Users,
  ArrowRightLeft,
  Warehouse,
  PackageCheck,
  Loader2,
  CheckCircle2,
  Building2,
} from "lucide-react"

interface CoroTrakImport {
  id: string
  workOrderNumber: string
  fileName: string
  totalPersonMoves: number
  totalWorkItems: number
  originBuildings: string[]
  destBuildings: string[]
  storageCount: number
  interBuildingCount: number
  intraBuildingCount: number
  status: string
  importedAt: string
  client: { name: string; fullName: string }
  _count: { moves: number }
}

const STATUS_COLORS: Record<string, string> = {
  IMPORTED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
}

const MOCK_IMPORTS: CoroTrakImport[] = [
  {
    id: "mock-1", workOrderNumber: "OCA63814-1", fileName: "WorkOrder_OCA63814-1.xlsx",
    totalPersonMoves: 336, totalWorkItems: 3360, originBuildings: ["LAX2105", "LAX2126"],
    destBuildings: ["LAX2126"], storageCount: 46, interBuildingCount: 203, intraBuildingCount: 133,
    status: "COMPLETED", importedAt: "2026-03-15T14:30:00Z",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" }, _count: { moves: 336 },
  },
  {
    id: "mock-2", workOrderNumber: "OCA63920-2", fileName: "WorkOrder_OCA63920-2.xlsx",
    totalPersonMoves: 182, totalWorkItems: 1820, originBuildings: ["LAX2126"],
    destBuildings: ["LAX2126", "LAX2105"], storageCount: 12, interBuildingCount: 67, intraBuildingCount: 103,
    status: "IN_PROGRESS", importedAt: "2026-03-28T09:15:00Z",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" }, _count: { moves: 182 },
  },
  {
    id: "mock-3", workOrderNumber: "AZA127845-1", fileName: "WorkOrder_AZA127845-1.xlsx",
    totalPersonMoves: 94, totalWorkItems: 940, originBuildings: ["PHX4010"],
    destBuildings: ["PHX4010", "PHX4022"], storageCount: 8, interBuildingCount: 31, intraBuildingCount: 55,
    status: "COMPLETED", importedAt: "2026-02-20T11:00:00Z",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" }, _count: { moves: 94 },
  },
  {
    id: "mock-4", workOrderNumber: "OCA64100-1", fileName: "WorkOrder_OCA64100-1.xlsx",
    totalPersonMoves: 245, totalWorkItems: 2450, originBuildings: ["LAX2105", "LAX2126", "LAX2130"],
    destBuildings: ["LAX2126"], storageCount: 32, interBuildingCount: 156, intraBuildingCount: 57,
    status: "IMPORTED", importedAt: "2026-04-01T08:45:00Z",
    client: { name: "AAA", fullName: "Automobile Club of Southern California" }, _count: { moves: 245 },
  },
]

export default function CoroTrakPage() {
  const [imports, setImports] = useState<CoroTrakImport[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    totalPersonMoves: number
    totalWorkItems: number
    storageCount: number
    interBuildingCount: number
    intraBuildingCount: number
    buildings: { origin: string[]; destination: string[] }
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [workOrderNumber, setWorkOrderNumber] = useState("")
  const [error, setError] = useState<string | null>(null)

  const fetchImports = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/corotrak/imports")
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setImports(json.data)
      } else {
        setImports(MOCK_IMPORTS)
      }
    } catch {
      setImports(MOCK_IMPORTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchImports()
  }, [fetchImports])

  const handleFile = (file: File) => {
    setSelectedFile(file)
    setUploadResult(null)
    setError(null)
    // Auto-detect WO number from filename (OCA pattern)
    const match = file.name.match(/(OCA\d+-\d+)/)
    if (match && !workOrderNumber) {
      setWorkOrderNumber(match[1])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith(".xlsx")) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    if (!selectedFile || !workOrderNumber) return
    setUploading(true)
    setError(null)
    setUploadResult(null)

    try {
      // Get the first client (for demo purposes)
      const clientsRes = await fetch("/api/v1/corotrak/imports")
      const clientsJson = await clientsRes.json()
      let clientId = clientsJson.data?.[0]?.clientId
      if (!clientId) {
        // Fallback: fetch from work orders
        const woRes = await fetch("/api/v1/work-orders?pageSize=1")
        const woJson = await woRes.json()
        clientId = woJson.data?.items?.[0]?.clientId
      }
      if (!clientId) {
        setError("No client found. Please ensure data is seeded.")
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("clientId", clientId)
      formData.append("workOrderNumber", workOrderNumber)

      const res = await fetch("/api/v1/corotrak/import", { method: "POST", body: formData })
      const json = await res.json()

      if (json.success) {
        setUploadResult(json.data)
        setSelectedFile(null)
        setWorkOrderNumber("")
        fetchImports()
      } else {
        setError(json.error || "Import failed")
      }
    } catch {
      setError("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const latestImport = imports[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CoroTrak Move Management</h1>
        <p className="text-sm text-muted-foreground">
          Import, track, and manage person moves from CoroTrak work orders
        </p>
      </div>

      {/* Summary Cards */}
      {latestImport ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestImport.totalPersonMoves}</p>
                  <p className="text-xs text-muted-foreground">Person Moves</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <ArrowRightLeft className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestImport.interBuildingCount}</p>
                  <p className="text-xs text-muted-foreground">Inter-Building</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Warehouse className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestImport.storageCount}</p>
                  <p className="text-xs text-muted-foreground">To Storage</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <PackageCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestImport.totalWorkItems.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Work Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No imports yet</p>
            <p className="text-sm">Upload a CoroTrak Excel file below to get started</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import CoroTrak Work Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragOver ? "border-[#ea580c] bg-orange-50" : "border-gray-200 hover:border-gray-300",
              selectedFile && "border-green-300 bg-green-50"
            )}
            onClick={() => document.getElementById("corotrak-file-input")?.click()}
          >
            <input
              id="corotrak-file-input"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileInput}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                <span className="font-medium text-green-700">{selectedFile.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-600">
                  Drop a CoroTrak .xlsx file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Accepts standard CoroTrak export format
                </p>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Work Order Number</label>
              <Input
                placeholder="e.g. OCA63814-1"
                value={workOrderNumber}
                onChange={(e) => setWorkOrderNumber(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleImport}
                disabled={!selectedFile || !workOrderNumber || uploading}
                className="bg-[#ea580c] hover:bg-[#c2410c]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {uploadResult && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">Import Successful</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Person Moves</p>
                  <p className="font-bold text-lg">{uploadResult.totalPersonMoves}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Work Items</p>
                  <p className="font-bold text-lg">{uploadResult.totalWorkItems.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">To Storage</p>
                  <p className="font-bold text-lg">{uploadResult.storageCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inter-Building</p>
                  <p className="font-bold text-lg">{uploadResult.interBuildingCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Buildings</p>
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    {uploadResult.buildings.origin.map((b) => (
                      <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Imports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Past Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : imports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No imports found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Work Order #</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Person Moves</th>
                    <th className="pb-2 font-medium text-right">Work Items</th>
                    <th className="pb-2 font-medium">Buildings</th>
                    <th className="pb-2 font-medium text-right">Storage %</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => {
                    const storagePct = imp.totalPersonMoves > 0
                      ? Math.round((imp.storageCount / imp.totalPersonMoves) * 100)
                      : 0
                    return (
                      <tr key={imp.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3">
                          <Link
                            href={`/corotrak/${imp.id}`}
                            className="text-[#ea580c] font-medium hover:underline"
                          >
                            {imp.workOrderNumber}
                          </Link>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {format(new Date(imp.importedAt), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 text-right font-medium">{imp.totalPersonMoves}</td>
                        <td className="py-3 text-right">{imp.totalWorkItems.toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{[...new Set([...imp.originBuildings, ...imp.destBuildings])].join(", ")}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">{storagePct}%</td>
                        <td className="py-3">
                          <Badge className={cn("text-xs", STATUS_COLORS[imp.status] || "bg-gray-100 text-gray-700")}>
                            {imp.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
