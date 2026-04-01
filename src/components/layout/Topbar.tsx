"use client"

import { useSession, signOut } from "next-auth/react"
import { useClientContext } from "@/lib/client-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Bell, LogOut, Search, Building2, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function Topbar() {
  const { data: session } = useSession()
  const { client, clients, setClientId } = useClientContext()
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets, orders..." className="pl-9 h-9 w-64" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Client Switcher */}
        {clients.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border px-3 py-1.5 hover:bg-accent transition-colors">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium max-w-[140px] truncate">{client?.name || "Select Client"}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Switch Client</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {clients.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => setClientId(c.id)}
                  className={cn(c.id === client?.id && "bg-accent")}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                      {c.customerKey.slice(0, 3)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      {c.fmCompany && <div className="text-[10px] text-muted-foreground">{c.fmCompany}</div>}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button className="relative p-2 rounded-md hover:bg-accent transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-accent transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium">{session?.user?.name || "User"}</div>
              <div className="text-[11px] text-muted-foreground">{session?.user?.role?.replace(/_/g, " ") || "Guest"}</div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{session?.user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
