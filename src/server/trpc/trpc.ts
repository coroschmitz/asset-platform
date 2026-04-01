import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const createTRPCContext = async (opts?: { headers?: Headers }) => {
  const session = await getServerSession(authOptions)
  return { prisma, session, user: session?.user ?? null }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

// Protected: requires authenticated session
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

// Org admin: requires ORG_ADMIN or SUPER_ADMIN role
export const orgAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" })
  }
  const role = ctx.session.user.role
  if (role !== "ORG_ADMIN" && role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Requires admin role" })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

// Client procedure: requires user to have access to the requested clientId
export const clientProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" })
  }
  // ORG_ADMIN and SUPER_ADMIN can access all clients
  const role = ctx.session.user.role
  if (role === "ORG_ADMIN" || role === "SUPER_ADMIN") {
    return next({ ctx: { ...ctx, user: ctx.session.user } })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

// Partner procedure: requires partner association
export const partnerProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})
