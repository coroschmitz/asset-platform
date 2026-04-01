import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const dormantAssets = await prisma.asset.findMany({
      where: {
        status: "IN_STORAGE",
        OR: [
          { lastMovedDate: null },
          { lastMovedDate: { lt: twelveMonthsAgo } },
        ],
      },
      include: {
        location: { select: { name: true, city: true, state: true } },
        client: { select: { name: true } },
      },
      orderBy: { monthlyStorageCost: "desc" },
      take: 50,
    });

    const totalDormant = dormantAssets.length;
    const totalMonthlyCost = dormantAssets.reduce((sum, a) => sum + (a.monthlyStorageCost || 0), 0);
    const totalAnnualCost = totalMonthlyCost * 12;
    const estimatedRecovery = dormantAssets.reduce((sum, a) => sum + (a.estimatedResaleValue || 0), 0);

    const byDisposition: Record<string, { count: number; monthlyCost: number }> = {};
    const byState: Record<string, { count: number; monthlyCost: number }> = {};
    const byCategory: Record<string, { count: number; monthlyCost: number }> = {};

    for (const asset of dormantAssets) {
      const disp = asset.dispositionRec || "Unassigned";
      if (!byDisposition[disp]) byDisposition[disp] = { count: 0, monthlyCost: 0 };
      byDisposition[disp].count++;
      byDisposition[disp].monthlyCost += asset.monthlyStorageCost || 0;

      const state = asset.location?.state || "Unknown";
      if (!byState[state]) byState[state] = { count: 0, monthlyCost: 0 };
      byState[state].count++;
      byState[state].monthlyCost += asset.monthlyStorageCost || 0;

      const cat = asset.category || "Unknown";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, monthlyCost: 0 };
      byCategory[cat].count++;
      byCategory[cat].monthlyCost += asset.monthlyStorageCost || 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalDormant,
        totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
        totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
        estimatedRecovery: Math.round(estimatedRecovery * 100) / 100,
        byDisposition,
        byState,
        byCategory,
        assets: dormantAssets,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
