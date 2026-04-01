import { router } from "./trpc"
import { dashboardRouter } from "./dashboard"
import { assetsRouter } from "./assets"
import { ordersRouter } from "./orders"
import { locationsRouter } from "./locations"
import { partnersRouter } from "./partners"
import { analyticsRouter } from "./analytics"
import { billingRouter } from "./billing"

export const appRouter = router({
  dashboard: dashboardRouter,
  assets: assetsRouter,
  orders: ordersRouter,
  locations: locationsRouter,
  partners: partnersRouter,
  analytics: analyticsRouter,
  billing: billingRouter,
})

export type AppRouter = typeof appRouter
