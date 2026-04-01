"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  MapPin,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Cable,
  DollarSign,
  Leaf,
  Radio,
  FolderKanban,
  ScanBarcode,
  Sparkles,
} from "lucide-react"
import { useState } from "react"
import { useClientContext } from "@/lib/client-context"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Work Orders", href: "/orders", icon: ClipboardList },
  { name: "CoroTrak", href: "/corotrak", icon: ScanBarcode },
  { name: "RFID", href: "/rfid", icon: Radio },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Locations", href: "/locations", icon: MapPin },
  { name: "Partners", href: "/partners", icon: Users },
  { name: "Integrations", href: "/integrations", icon: Cable },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Sustainability", href: "/sustainability", icon: Leaf },
  { name: "Billing", href: "/billing", icon: DollarSign },
  { name: "AI Assistant", href: "/ai", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { client } = useClientContext()

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-gradient-to-b from-gray-900 to-gray-950 text-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ea580c] text-white font-bold text-sm">
              C
            </div>
            <div>
              <div className="font-semibold text-sm text-white">Corovan</div>
              <div className="text-[10px] text-gray-400">Asset Platform</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ea580c] text-white font-bold text-sm mx-auto">
            C
          </div>
        )}
      </div>

      {/* Client Context */}
      {!collapsed && client && (
        <div className="mx-3 mt-3 rounded-lg bg-white/5 border border-white/10 p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
              {client.customerKey.slice(0, 3)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-200 truncate">{client.fullName || client.name}</div>
              {client.fmCompany && <div className="text-[10px] text-gray-400 truncate">{client.fmCompany}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2 mt-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#ea580c] text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
