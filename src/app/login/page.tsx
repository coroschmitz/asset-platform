"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const DEMO_USERS = [
  { name: "Max Schmitz", email: "max@corovan.com", role: "Corovan Account Executive" },
  { name: "Winnie Pham", email: "winnie.pham@cushwake.com", role: "Cushman & Wakefield FM" },
  { name: "Matt McKinley", email: "matt.mckinley@cushwake.com", role: "Cushman & Wakefield Director" },
]

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleLogin = async (email: string) => {
    setLoading(email)
    await signIn("credentials", { email, callbackUrl: "/dashboard" })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            C
          </div>
          <h1 className="mt-4 text-2xl font-bold">Corovan Asset Platform</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            National Commercial Furniture Asset Management
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-center text-muted-foreground">
            Select a demo account to continue
          </p>
          {DEMO_USERS.map((user) => (
            <button
              key={user.email}
              onClick={() => handleLogin(user.email)}
              disabled={loading !== null}
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {user.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.role}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
              {loading === user.email && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Demo environment &mdash; No password required
        </p>
      </div>
    </div>
  )
}
