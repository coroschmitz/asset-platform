import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const dispositions = await prisma.disposition.findMany();

    const divertedMethods = ["recycle", "donate", "resell", "repurpose", "refurbish"];
    const disposedMethods = ["landfill", "dispose"];

    let totalDiverted = 0;
    let totalDisposed = 0;
    let totalWeightDiverted = 0;
    let totalCarbonAvoided = 0;

    const byMethod: Record<string, { count: number; weightLbs: number; carbonAvoidedLbs: number }> = {};
    const byMaterialType: Record<string, { count: number; weightLbs: number; carbonAvoidedLbs: number }> = {};

    for (const d of dispositions) {
      const method = d.method.toLowerCase();
      const isDiverted = divertedMethods.includes(method);

      if (isDiverted) {
        totalDiverted++;
        totalWeightDiverted += d.weightLbs || 0;
        totalCarbonAvoided += d.carbonAvoidedLbs || 0;
      } else if (disposedMethods.includes(method)) {
        totalDisposed++;
      } else {
        totalDiverted++;
      }

      if (!byMethod[d.method]) byMethod[d.method] = { count: 0, weightLbs: 0, carbonAvoidedLbs: 0 };
      byMethod[d.method].count++;
      byMethod[d.method].weightLbs += d.weightLbs || 0;
      byMethod[d.method].carbonAvoidedLbs += d.carbonAvoidedLbs || 0;

      const mat = d.materialType || "Unknown";
      if (!byMaterialType[mat]) byMaterialType[mat] = { count: 0, weightLbs: 0, carbonAvoidedLbs: 0 };
      byMaterialType[mat].count++;
      byMaterialType[mat].weightLbs += d.weightLbs || 0;
      byMaterialType[mat].carbonAvoidedLbs += d.carbonAvoidedLbs || 0;
    }

    const total = totalDiverted + totalDisposed;
    const diversionRate = total > 0 ? Math.round((totalDiverted / total) * 100 * 100) / 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalDiverted,
        totalDisposed,
        diversionRate,
        totalWeightDiverted: Math.round(totalWeightDiverted * 100) / 100,
        totalCarbonAvoided: Math.round(totalCarbonAvoided * 100) / 100,
        byMethod,
        byMaterialType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
