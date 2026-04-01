"use client"

import { useEffect, useState } from "react"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface DormantSummary {
  summary: {
    totalDormant: number
    totalMonthlyCost: number
  }
}

export function DormantAlert() {
  const [data, setData] = useState<DormantSummary | null>(null)

  useEffect(() => {
    fetch("/api/v1/analytics/dormant-assets")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
  }, [])

  if (!data) return null

  return (
    <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{formatNumber(data.summary.totalDormant)} dormant assets</span> costing{" "}
            <span className="font-semibold">{formatCurrency(data.summary.totalMonthlyCost)}/month</span>
          </p>
        </div>
        <Link
          href="/analytics/lifecycle"
          className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
        >
          View Details &rarr;
        </Link>
      </div>
    </div>
  )
}
