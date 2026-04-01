import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

/**
 * Scope 3 Category 5 — Waste Generated in Operations
 *
 * Returns emissions data aligned with GHG Protocol Scope 3 Category 5.
 * Calculates total waste by treatment type and emissions per treatment
 * using EPA WARM emission factors stored in EmissionFactor table.
 *
 * Query params:
 *   clientId  - required, filter by client
 *   startDate - optional, ISO date string
 *   endDate   - optional, ISO date string
 *   format    - "json" (default) or "csv"
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json";

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId query parameter is required" },
        { status: 400 }
      );
    }

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Fetch dispositions and emission factors in parallel
    const [dispositions, emissionFactors] = await Promise.all([
      prisma.disposition.findMany({
        where: {
          asset: { clientId },
          ...(Object.keys(dateFilter).length > 0 ? { completedAt: dateFilter } : {}),
        },
        include: {
          asset: {
            select: { clientId: true, type: true, category: true },
          },
        },
      }),
      prisma.emissionFactor.findMany(),
    ]);

    // Build lookup map for emission factors
    const factorMap = new Map<string, number>();
    for (const ef of emissionFactors) {
      factorMap.set(`${ef.materialType}|${ef.dispositionMethod}`, ef.co2PerTonLbs);
    }

    // Categorize treatment types
    const recycledMethods = [
      "recycle", "recycled", "e-waste certified", "itad certified",
    ];
    const reuseMethods = [
      "donate", "donated", "resell", "resell/remarket", "repurpose",
      "repurpose internal", "refurbish", "redeployed", "liquidated",
    ];
    const landfillMethods = ["landfill", "dispose", "disposed"];

    interface TreatmentData {
      weightLbs: number;
      count: number;
      co2AvoidedLbs: number;
    }

    const byTreatment: Record<string, TreatmentData> = {
      recycling: { weightLbs: 0, count: 0, co2AvoidedLbs: 0 },
      reuse: { weightLbs: 0, count: 0, co2AvoidedLbs: 0 },
      landfill: { weightLbs: 0, count: 0, co2AvoidedLbs: 0 },
      other: { weightLbs: 0, count: 0, co2AvoidedLbs: 0 },
    };

    const byMaterial: Record<string, {
      weightLbs: number;
      count: number;
      co2AvoidedLbs: number;
      treatment: string;
    }> = {};

    let totalWeightLbs = 0;
    let totalCo2AvoidedLbs = 0;

    for (const d of dispositions) {
      const method = d.method.toLowerCase();
      const weight = d.weightLbs || 0;
      const material = d.materialType || "Mixed materials";
      totalWeightLbs += weight;

      // Determine treatment category
      let treatment: string;
      if (recycledMethods.includes(method)) {
        treatment = "recycling";
      } else if (reuseMethods.includes(method)) {
        treatment = "reuse";
      } else if (landfillMethods.includes(method)) {
        treatment = "landfill";
      } else {
        treatment = "other";
      }

      // Look up emission factor based on material and disposition method
      const dispositionKey = landfillMethods.includes(method) ? "landfilled" : "recycled";
      const co2PerTon = factorMap.get(`${material}|${dispositionKey}`) || 0;
      const co2Lbs = (weight / 2000) * co2PerTon;

      byTreatment[treatment].weightLbs += weight;
      byTreatment[treatment].count++;
      byTreatment[treatment].co2AvoidedLbs += co2Lbs;
      totalCo2AvoidedLbs += co2Lbs;

      // Track by material
      const matKey = `${material}|${treatment}`;
      if (!byMaterial[matKey]) {
        byMaterial[matKey] = { weightLbs: 0, count: 0, co2AvoidedLbs: 0, treatment };
      }
      byMaterial[matKey].weightLbs += weight;
      byMaterial[matKey].count++;
      byMaterial[matKey].co2AvoidedLbs += co2Lbs;
    }

    // Convert to metric tons CO2e (1 metric ton = 2204.62 lbs)
    const LBS_PER_METRIC_TON = 2204.62;
    const totalCo2MetricTons = Math.round((totalCo2AvoidedLbs / LBS_PER_METRIC_TON) * 100) / 100;

    const treatmentSummary = Object.entries(byTreatment)
      .filter(([, data]) => data.count > 0)
      .map(([treatment, data]) => ({
        treatment,
        weightLbs: Math.round(data.weightLbs * 100) / 100,
        weightTons: Math.round((data.weightLbs / 2000) * 100) / 100,
        count: data.count,
        co2AvoidedLbs: Math.round(data.co2AvoidedLbs * 100) / 100,
        co2AvoidedMetricTons: Math.round((data.co2AvoidedLbs / LBS_PER_METRIC_TON) * 100) / 100,
      }));

    const materialBreakdown = Object.entries(byMaterial)
      .filter(([, data]) => data.count > 0)
      .map(([key, data]) => {
        const [material] = key.split("|");
        return {
          material,
          treatment: data.treatment,
          weightLbs: Math.round(data.weightLbs * 100) / 100,
          count: data.count,
          co2AvoidedLbs: Math.round(data.co2AvoidedLbs * 100) / 100,
          co2AvoidedMetricTons: Math.round((data.co2AvoidedLbs / LBS_PER_METRIC_TON) * 100) / 100,
        };
      })
      .sort((a, b) => b.co2AvoidedLbs - a.co2AvoidedLbs);

    const report = {
      standard: "GHG Protocol - Scope 3 Category 5: Waste Generated in Operations",
      methodology: "EPA WARM Model v16 emission factors",
      reportingPeriod: {
        startDate: startDate || "all-time",
        endDate: endDate || "present",
      },
      clientId,
      summary: {
        totalWeightLbs: Math.round(totalWeightLbs * 100) / 100,
        totalWeightTons: Math.round((totalWeightLbs / 2000) * 100) / 100,
        totalItems: dispositions.length,
        totalCo2AvoidedLbs: Math.round(totalCo2AvoidedLbs * 100) / 100,
        totalCategory5MetricTonsCo2e: totalCo2MetricTons,
      },
      byTreatmentType: treatmentSummary,
      byMaterial: materialBreakdown,
    };

    if (format === "csv") {
      const rows: string[] = [];
      rows.push("Scope 3 Category 5 - Waste Generated in Operations");
      rows.push(`Methodology,EPA WARM Model v16`);
      rows.push(`Reporting Period,${startDate || "all-time"} to ${endDate || "present"}`);
      rows.push(`Client ID,${clientId}`);
      rows.push("");
      rows.push("Summary");
      rows.push(`Total Waste,${report.summary.totalWeightTons},tons`);
      rows.push(`Total Items,${report.summary.totalItems},items`);
      rows.push(`Total Category 5 Emissions,${report.summary.totalCategory5MetricTonsCo2e},metric tons CO2e`);
      rows.push("");
      rows.push("Treatment Type,Weight (tons),Items,CO2 Avoided (metric tons CO2e)");
      for (const t of treatmentSummary) {
        rows.push(`${t.treatment},${t.weightTons},${t.count},${t.co2AvoidedMetricTons}`);
      }
      rows.push("");
      rows.push("Material,Treatment,Weight (lbs),Items,CO2 Avoided (metric tons CO2e)");
      for (const m of materialBreakdown) {
        rows.push(`"${m.material}",${m.treatment},${m.weightLbs},${m.count},${m.co2AvoidedMetricTons}`);
      }

      const csv = rows.join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="scope3-cat5-report-${clientId}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
