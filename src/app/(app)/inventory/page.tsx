"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { AssetGrid } from "@/components/inventory/AssetGrid"
import { ColumnFilter } from "@/components/inventory/ColumnFilter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Search, Download, X, Image as ImageIcon, Maximize2 } from "lucide-react"

export default function InventoryPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [locationId, setLocationId] = useState<string>("")
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [showPictures, setShowPictures] = useState(true)
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filterOptions = trpc.assets.getFilterOptions.useQuery()

  const assets = trpc.assets.list.useQuery({
    page,
    pageSize,
    search: search || undefined,
    locationId: locationId || undefined,
    type: filters.type?.length ? filters.type : undefined,
    category: filters.category?.length ? filters.category : undefined,
    status: filters.status?.length ? filters.status : undefined,
    condition: filters.condition?.length ? filters.condition : undefined,
    manufacturer: filters.manufacturer?.length ? filters.manufacturer : undefined,
    sortBy,
    sortDir,
  })

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleFilterChange = (column: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [column]: values }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setSearch("")
    setSearchInput("")
    setLocationId("")
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0) || !!search || !!locationId

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortDir("asc")
    }
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, assets.data?.total || 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage furniture assets across all locations</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3">
        {/* Location filter */}
        <Select
          value={locationId}
          onChange={(e) => { setLocationId(e.target.value); setPage(1) }}
          className="w-56 text-xs"
        >
          <option value="">All Locations</option>
          {filterOptions.data?.locations && (
            <>
              <optgroup label="Primary Offices">
                {filterOptions.data.locations
                  .filter((l) => l.locationType === "PRIMARY")
                  .map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
              </optgroup>
              <optgroup label="Branch Offices">
                {filterOptions.data.locations
                  .filter((l) => l.locationType === "BRANCH")
                  .map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.state})</option>
                  ))}
              </optgroup>
            </>
          )}
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tag, description, manufacturer..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant={showPictures ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowPictures(!showPictures)}
            className="text-xs"
          >
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            Pictures
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-destructive">
              <X className="h-3.5 w-3.5 mr-1" />
              Clear Filters
            </Button>
          )}

          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Grid */}
      <AssetGrid
        assets={assets.data?.items || []}
        loading={assets.isLoading}
        showPictures={showPictures}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        filterOptions={filterOptions.data}
        activeFilters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {assets.data ? `${start} – ${end} of ${formatNum(assets.data.total)} items` : "Loading..."}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={pageSize.toString()}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="w-20 text-xs"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </Select>
          <span className="text-xs text-muted-foreground">per page</span>
          <div className="flex gap-1 ml-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Prev
            </Button>
            {Array.from({ length: Math.min(5, assets.data?.totalPages || 1) }, (_, i) => {
              const pageNum = getPageNumbers(page, assets.data?.totalPages || 1, 5)[i]
              if (!pageNum) return null
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="w-8"
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button variant="outline" size="sm" disabled={page >= (assets.data?.totalPages || 1)} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline">Update Status</Button>
          <Button size="sm" variant="outline">Move</Button>
          <Button size="sm" variant="outline">Export</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function formatNum(n: number) {
  return new Intl.NumberFormat("en-US").format(n)
}

function getPageNumbers(current: number, total: number, maxVisible: number): number[] {
  if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1)
  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, current - half)
  const end = Math.min(total, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
