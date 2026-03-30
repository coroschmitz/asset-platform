"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { formatNumber } from "@/lib/utils"

const COLORS = ["#ea580c", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#6366f1", "#0891b2"]

interface CategoryData {
  category: string
  count: number
  value: number
}

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (!data.length) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data</div>
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="count"
            nameKey="category"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => value.length > 18 ? value.slice(0, 18) + "..." : value}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
