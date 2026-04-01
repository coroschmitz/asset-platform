import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const platforms = ["corrigo", "servicenow", "cbre", "cushman"];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = await Promise.all(
      platforms.map(async (platform) => {
        const [total, last24hCount, lastLog, successCount] = await Promise.all([
          prisma.webhookLog.count({ where: { source: platform } }),
          prisma.webhookLog.count({ where: { source: platform, createdAt: { gte: last24h } } }),
          prisma.webhookLog.findFirst({ where: { source: platform }, orderBy: { createdAt: "desc" } }),
          prisma.webhookLog.count({ where: { source: platform, status: "processed" } }),
        ]);

        return {
          platform,
          total,
          last24h: last24hCount,
          lastTimestamp: lastLog?.createdAt || null,
          successRate: total > 0 ? Math.round((successCount / total) * 100 * 100) / 100 : 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
