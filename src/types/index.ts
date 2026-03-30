import { UserRole } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      orgId: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    orgId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    orgId: string | null
  }
}
