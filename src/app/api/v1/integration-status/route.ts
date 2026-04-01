import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

const PLATFORMS = ["corrigo", "servicenow", "cbre", "cushman"] as const

export async function GET(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  try {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const result: Record<string, unknown> = {}

    for (const platform of PLATFORMS) {
      const [total, last24hCount, successCount, failureCount, lastLog, config] = await Promise.all([
        prisma.webhookLog.count({ where: { source: platform } }),
        prisma.webhookLog.count({ where: { source: platform, createdAt: { gte: last24h } } }),
        prisma.webhookLog.count({ where: { source: platform, status: "processed" } }),
        prisma.webhookLog.count({ where: { source: platform, status: "failed" } }),
        prisma.webhookLog.findFirst({ where: { source: platform }, orderBy: { createdAt: "desc" } }),
        prisma.fmPlatformConfig.findFirst({ where: { platform } }),
      ])

      result[platform] = {
        totalWebhooks: total,
        last24hCount,
        lastReceivedAt: lastLog?.createdAt || null,
        successCount,
        failureCount,
        configActive: config?.isActive ?? false,
        hasConfig: !!config,
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}
