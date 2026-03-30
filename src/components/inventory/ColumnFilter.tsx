"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ColumnFilterProps {
  label: string
  values: string[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function ColumnFilter({ label, values, selected, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalSelected(new Set(selected))
  }, [selected])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const filtered = values.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase())
  )

  const toggleValue = (val: string) => {
    const next = new Set(localSelected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setLocalSelected(next)
  }

  const selectAll = () => {
    setLocalSelected(new Set(filtered))
  }

  const clearAll = () => {
    setLocalSelected(new Set())
  }

  const applyFilter = () => {
    onChange(Array.from(localSelected))
    setOpen(false)
  }

  const clearFilter = () => {
    onChange([])
    setLocalSelected(new Set())
    setOpen(false)
  }

  const isActive = selected.length > 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "p-0.5 rounded hover:bg-accent",
          isActive && "text-primary"
        )}
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-background shadow-xl">
          <div className="p-2 border-b">
            <Input
              placeholder={`Search ${label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          <div className="flex items-center justify-between px-2 py-1 border-b">
            <button onClick={selectAll} className="text-[10px] text-primary hover:underline">
              Select All
            </button>
            <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:underline">
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map((val) => (
              <label
                key={val}
                className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent cursor-pointer"
              >
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded-sm border flex items-center justify-center",
                    localSelected.has(val) ? "bg-primary border-primary" : "border-gray-300"
                  )}
                >
                  {localSelected.has(val) && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <span className="truncate">{val.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2 p-2 border-t">
            <Button
              size="sm"
              onClick={applyFilter}
              className="flex-1 h-7 text-xs bg-primary hover:bg-primary/90"
            >
              Filter
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearFilter}
              className="flex-1 h-7 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
