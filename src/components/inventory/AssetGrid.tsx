"use client"

import { cn } from "@/lib/utils"
import { ColumnFilter } from "./ColumnFilter"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Asset {
  id: string
  tagNumber: string
  description: string
  type: string
  category: string
  manufacturer: string | null
  width: number | null
  height: number | null
  depth: number | null
  primaryMaterial: string | null
  primaryColor: string | null
  quantity: number
  condition: string
  status: string
  currentValue: number | null
  photos: { url: string }[]
  location: {
    name: string
    city: string
    state: string
    partner: { name: string } | null
  }
}

interface FilterOptions {
  types: string[]
  categories: string[]
  statuses: string[]
  conditions: string[]
  manufacturers: string[]
  locations: { id: string; name: string; city: string; state: string; locationType: string }[]
}

interface AssetGridProps {
  assets: Asset[]
  loading: boolean
  showPictures: boolean
  sortBy?: string
  sortDir?: "asc" | "desc"
  onSort: (column: string) => void
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  filterOptions?: FilterOptions
  activeFilters: Record<string, string[]>
  onFilterChange: (column: string, values: string[]) => void
}

const CONDITION_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-700",
  GOOD: "bg-blue-100 text-blue-700",
  FAIR: "bg-yellow-100 text-yellow-700",
  POOR: "bg-orange-100 text-orange-700",
  DAMAGED: "bg-red-100 text-red-700",
}

const STATUS_COLORS: Record<string, string> = {
  IN_STORAGE: "bg-gray-100 text-gray-700",
  DEPLOYED: "bg-green-100 text-green-700",
  AVAILABLE: "bg-blue-100 text-blue-700",
  RESERVED: "bg-purple-100 text-purple-700",
  IN_TRANSIT: "bg-orange-100 text-orange-700",
  DECOMMISSIONED: "bg-red-100 text-red-700",
}

export function AssetGrid({
  assets,
  loading,
  showPictures,
  sortBy,
  sortDir,
  onSort,
  selectedIds,
  onSelectionChange,
  filterOptions,
  activeFilters,
  onFilterChange,
}: AssetGridProps) {
  const allSelected = assets.length > 0 && assets.every((a) => selectedIds.has(a.id))

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(assets.map((a) => a.id)))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 opacity-30" />
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-background overflow-hidden">
        <div className="space-y-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 border-b p-2">
              <Skeleton className="h-4 w-4" />
              {showPictures && <Skeleton className="h-[35px] w-[35px]" />}
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              {showPictures && <th className="w-10 px-1 py-2">Photo</th>}
              <th className="w-10 px-2 py-2">Qty</th>
              <HeaderCell label="Tag #" column="tagNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Description" column="description" sortBy={sortBy} sortDir={sortDir} onSort={onSort} wide />
              <HeaderCell
                label="Type"
                column="type"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                filterable
                filterValues={filterOptions?.types || []}
                activeFilter={activeFilters.type}
                onFilterChange={(vals) => onFilterChange("type", vals)}
              />
              <HeaderCell
                label="Category"
                column="category"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                filterable
                filterValues={filterOptions?.categories || []}
                activeFilter={activeFilters.category}
                onFilterChange={(vals) => onFilterChange("category", vals)}
              />
              <th className="w-10 px-2 py-2">W</th>
              <th className="w-10 px-2 py-2">H</th>
              <th className="w-10 px-2 py-2">D</th>
              <HeaderCell
                label="Manufacturer"
                column="manufacturer"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                filterable
                filterValues={filterOptions?.manufacturers || []}
                activeFilter={activeFilters.manufacturer}
                onFilterChange={(vals) => onFilterChange("manufacturer", vals)}
              />
              <th className="px-2 py-2">Material</th>
              <th className="px-2 py-2">Color</th>
              <th className="px-2 py-2">Location</th>
              <th className="px-2 py-2">Partner</th>
              <HeaderCell
                label="Condition"
                column="condition"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                filterable
                filterValues={filterOptions?.conditions || []}
                activeFilter={activeFilters.condition}
                onFilterChange={(vals) => onFilterChange("condition", vals)}
              />
              <HeaderCell
                label="Status"
                column="status"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                filterable
                filterValues={filterOptions?.statuses || []}
                activeFilter={activeFilters.status}
                onFilterChange={(vals) => onFilterChange("status", vals)}
              />
              <HeaderCell label="Value" column="currentValue" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, idx) => (
              <tr
                key={asset.id}
                className={cn(
                  "border-b hover:bg-blue-50/50 transition-colors",
                  idx % 2 === 1 && "bg-muted/20",
                  selectedIds.has(asset.id) && "bg-primary/5"
                )}
              >
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(asset.id)}
                    onChange={() => toggleOne(asset.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                {showPictures && (
                  <td className="px-1 py-1.5">
                    <div className="h-[35px] w-[35px] rounded border bg-gray-100 flex items-center justify-center overflow-hidden">
                      {asset.photos[0] ? (
                        <img src={asset.photos[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <svg className="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-2 py-1.5 text-center">{asset.quantity}</td>
                <td className="px-2 py-1.5 font-mono font-medium text-primary">{asset.tagNumber}</td>
                <td className="px-2 py-1.5 max-w-[200px] truncate" title={asset.description}>{asset.description}</td>
                <td className="px-2 py-1.5">{asset.type}</td>
                <td className="px-2 py-1.5">{asset.category}</td>
                <td className="px-2 py-1.5 text-center">{asset.width || "—"}</td>
                <td className="px-2 py-1.5 text-center">{asset.height || "—"}</td>
                <td className="px-2 py-1.5 text-center">{asset.depth || "—"}</td>
                <td className="px-2 py-1.5">{asset.manufacturer || "—"}</td>
                <td className="px-2 py-1.5">{asset.primaryMaterial || "—"}</td>
                <td className="px-2 py-1.5">{asset.primaryColor || "—"}</td>
                <td className="px-2 py-1.5 truncate max-w-[120px]" title={asset.location.name}>
                  {asset.location.city}, {asset.location.state}
                </td>
                <td className="px-2 py-1.5 truncate max-w-[100px]">
                  {asset.location.partner?.name || "—"}
                </td>
                <td className="px-2 py-1.5">
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", CONDITION_COLORS[asset.condition])}>
                    {asset.condition}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap", STATUS_COLORS[asset.status])}>
                    {asset.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {asset.currentValue ? `$${Math.round(asset.currentValue).toLocaleString()}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HeaderCell({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
  wide,
  filterable,
  filterValues,
  activeFilter,
  onFilterChange,
}: {
  label: string
  column: string
  sortBy?: string
  sortDir?: "asc" | "desc"
  onSort: (col: string) => void
  wide?: boolean
  filterable?: boolean
  filterValues?: string[]
  activeFilter?: string[]
  onFilterChange?: (vals: string[]) => void
}) {
  const isActive = activeFilter && activeFilter.length > 0

  return (
    <th className={cn("px-2 py-2 whitespace-nowrap", wide && "min-w-[200px]")}>
      <div className="flex items-center gap-1">
        <button onClick={() => onSort(column)} className="flex items-center gap-1 hover:text-foreground">
          <span className={isActive ? "text-primary font-bold" : ""}>{label}</span>
          {sortBy === column ? (
            sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </button>
        {filterable && filterValues && onFilterChange && (
          <ColumnFilter
            label={label}
            values={filterValues}
            selected={activeFilter || []}
            onChange={onFilterChange}
          />
        )}
      </div>
    </th>
  )
}
