"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Upload, FileSpreadsheet, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"

const ASSET_FIELDS = [
  { value: "skip", label: "Skip" },
  { value: "tagNumber", label: "Tag Number" },
  { value: "description", label: "Description" },
  { value: "type", label: "Type" },
  { value: "category", label: "Category" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "width", label: "Width" },
  { value: "height", label: "Height" },
  { value: "depth", label: "Depth" },
  { value: "primaryMaterial", label: "Primary Material" },
  { value: "primaryColor", label: "Primary Color" },
  { value: "quantity", label: "Quantity" },
  { value: "condition", label: "Condition" },
  { value: "status", label: "Status" },
  { value: "costCenter", label: "Cost Center" },
  { value: "serialNumber", label: "Serial Number" },
]

const AUTO_MAP: Record<string, string> = {
  tag: "tagNumber",
  "tag number": "tagNumber",
  "tag#": "tagNumber",
  tagnumber: "tagNumber",
  description: "description",
  desc: "description",
  type: "type",
  category: "category",
  manufacturer: "manufacturer",
  mfg: "manufacturer",
  width: "width",
  height: "height",
  depth: "depth",
  material: "primaryMaterial",
  "primary material": "primaryMaterial",
  color: "primaryColor",
  "primary color": "primaryColor",
  quantity: "quantity",
  qty: "quantity",
  condition: "condition",
  status: "status",
  "cost center": "costCenter",
  costcenter: "costCenter",
  serial: "serialNumber",
  "serial number": "serialNumber",
  serialnumber: "serialNumber",
}

interface Client {
  id: string
  name: string
}

interface ImportResult {
  created: number
  updated: number
  errors: { row: number; message: string }[]
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [allRows, setAllRows] = useState<string[][]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorsExpanded, setErrorsExpanded] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/v1/clients")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : d.clients || []))
      .catch(() => {})
  }, [])

  const parseFile = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: "array" })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
      if (json.length < 2) return

      const hdrs = json[0].map(String)
      setHeaders(hdrs)
      setPreview(json.slice(1, 11))
      setAllRows(json.slice(1))

      // Auto-detect mapping
      const autoMap: Record<string, string> = {}
      hdrs.forEach((h) => {
        const normalized = h.trim().toLowerCase()
        if (AUTO_MAP[normalized]) {
          autoMap[h] = AUTO_MAP[normalized]
        }
      })
      setMapping(autoMap)
    }
    reader.readAsArrayBuffer(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files[0]
    if (f) parseFile(f)
  }, [parseFile])

  const handleImport = async () => {
    if (!clientId || allRows.length === 0) return
    setImporting(true)
    setResult(null)
    try {
      const res = await fetch("/api/v1/import/windfall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: allRows, mapping, clientId }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ created: 0, updated: 0, errors: [{ row: 0, message: "Import request failed" }] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Inventory Data</h1>
        <p className="text-sm text-muted-foreground">Upload CSV or XLSX files to import asset data</p>
      </div>

      {/* File Upload */}
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]) }}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{allRows.length} rows detected</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Drag & drop a CSV or XLSX file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview & Mapping */}
      {headers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Column Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">CSV Column</th>
                    <th className="pb-2 pr-4 font-medium">Map To</th>
                    {preview.slice(0, 3).map((_, i) => (
                      <th key={i} className="pb-2 pr-4 font-medium">Row {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => (
                    <tr key={h} className="border-b">
                      <td className="py-2 pr-4 font-medium">{h}</td>
                      <td className="py-2 pr-4">
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                          value={mapping[h] || "skip"}
                          onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                        >
                          {ASSET_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </td>
                      {preview.slice(0, 3).map((row, i) => (
                        <td key={i} className="py-2 pr-4 text-xs text-muted-foreground max-w-[120px] truncate">
                          {row[headers.indexOf(h)] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Selector + Import Button */}
      {headers.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="text-sm font-medium mb-1 block">Client</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleImport}
                disabled={!clientId || importing}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-6 py-2 text-sm font-medium text-white",
                  !clientId || importing ? "bg-muted-foreground/50 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
                )}
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Import
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{result.created} created</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{result.updated} updated</span>
              </div>
              {result.errors.length > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{result.errors.length} errors</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setErrorsExpanded(!errorsExpanded)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  {errorsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {errorsExpanded ? "Hide" : "Show"} error details
                </button>
                {errorsExpanded && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="text-red-600">
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
