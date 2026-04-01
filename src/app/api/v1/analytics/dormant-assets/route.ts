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

    // Build asset data with computed fields for the lifecycle page
    const assetsWithComputed = dormantAssets.map((a) => {
      const monthsDormant = a.lastMovedDate
        ? Math.floor((Date.now() - a.lastMovedDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        : a.dateReceived
        ? Math.floor((Date.now() - a.dateReceived.getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0
      return {
        id: a.id,
        tagNumber: a.tagNumber,
        description: a.description,
        clientName: a.client?.name ?? "",
        locationName: a.location?.name ?? "",
        state: a.location?.state ?? "",
        monthsDormant,
        monthlyStorageCost: a.monthlyStorageCost || 0,
        condition: a.condition,
        dispositionRec: a.dispositionRec || "Unassigned",
        estimatedResaleValue: a.estimatedResaleValue || 0,
      }
    })

    // Disposition breakdown for pie chart
    const dispositionBreakdown = Object.entries(byDisposition).map(([name, data]) => ({
      name,
      value: data.count,
    }))

    // State breakdown for bar chart
    const stateBreakdown = Object.entries(byState).map(([state, data]) => ({
      state,
      count: data.count,
    }))

    // Return flat shape consumed by lifecycle page and dormant alert
    return NextResponse.json({
      summary: {
        totalDormant,
        totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
        totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
        totalEstimatedRecovery: Math.round(estimatedRecovery * 100) / 100,
      },
      dispositionBreakdown,
      byState: stateBreakdown,
      assets: assetsWithComputed,
    });
  } catch (error) {
    return NextResponse.json(
      { summary: { totalDormant: 0, totalMonthlyCost: 0, totalAnnualCost: 0, totalEstimatedRecovery: 0 }, dispositionBreakdown: [], byState: [], assets: [] },
      { status: 500 }
    );
  }
}
