"use client"

import { useSession } from "next-auth/react"
import type { UserRole } from "@prisma/client"

interface RequireRoleProps {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role

  if (!userRole || !roles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
