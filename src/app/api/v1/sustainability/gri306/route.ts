import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

/**
 * GRI 306 Waste Reporting Endpoint
 *
 * Returns data aligned with GRI 306 disclosure requirements:
 * - GRI 306-3: Waste generated
 * - GRI 306-4: Waste diverted from disposal
 * - GRI 306-5: Waste directed to disposal
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

    const dispositions = await prisma.disposition.findMany({
      where: {
        asset: { clientId },
        ...(Object.keys(dateFilter).length > 0 ? { completedAt: dateFilter } : {}),
      },
      include: {
        asset: {
          select: { clientId: true, type: true, category: true },
        },
      },
    });

    const divertedMethods = [
      "recycle", "donate", "resell", "resell/remarket", "repurpose",
      "repurpose internal", "refurbish", "e-waste certified", "itad certified",
      "redeployed", "donated", "recycled", "liquidated",
    ];
    const landfillMethods = ["landfill", "dispose", "disposed"];

    // GRI 306-3: Total waste generated
    let totalWeightLbs = 0;
    let totalItems = 0;

    // GRI 306-4: Waste diverted from disposal
    const diverted: Record<string, { weightLbs: number; count: number }> = {};

    // GRI 306-5: Waste directed to disposal
    const disposed: Record<string, { weightLbs: number; count: number }> = {};

    // By material type
    const byMaterial: Record<string, { totalLbs: number; divertedLbs: number; disposedLbs: number }> = {};

    for (const d of dispositions) {
      const method = d.method.toLowerCase();
      const weight = d.weightLbs || 0;
      totalWeightLbs += weight;
      totalItems++;

      const mat = d.materialType || "Unknown";
      if (!byMaterial[mat]) byMaterial[mat] = { totalLbs: 0, divertedLbs: 0, disposedLbs: 0 };
      byMaterial[mat].totalLbs += weight;

      if (divertedMethods.includes(method)) {
        if (!diverted[d.method]) diverted[d.method] = { weightLbs: 0, count: 0 };
        diverted[d.method].weightLbs += weight;
        diverted[d.method].count++;
        byMaterial[mat].divertedLbs += weight;
      } else if (landfillMethods.includes(method)) {
        if (!disposed[d.method]) disposed[d.method] = { weightLbs: 0, count: 0 };
        disposed[d.method].weightLbs += weight;
        disposed[d.method].count++;
        byMaterial[mat].disposedLbs += weight;
      } else {
        // Default to diverted for unknown methods (hazmat, etc.)
        if (!diverted[d.method]) diverted[d.method] = { weightLbs: 0, count: 0 };
        diverted[d.method].weightLbs += weight;
        diverted[d.method].count++;
        byMaterial[mat].divertedLbs += weight;
      }
    }

    const totalDivertedLbs = Object.values(diverted).reduce((s, v) => s + v.weightLbs, 0);
    const totalDisposedLbs = Object.values(disposed).reduce((s, v) => s + v.weightLbs, 0);
    const diversionRate = totalWeightLbs > 0
      ? Math.round((totalDivertedLbs / totalWeightLbs) * 100 * 100) / 100
      : 0;

    const report = {
      standard: "GRI 306: Waste 2020",
      reportingPeriod: {
        startDate: startDate || "all-time",
        endDate: endDate || "present",
      },
      clientId,
      "gri306_3_wasteGenerated": {
        totalWeightLbs,
        totalWeightTons: Math.round((totalWeightLbs / 2000) * 100) / 100,
        totalItems,
        byMaterialType: byMaterial,
      },
      "gri306_4_wasteDiverted": {
        totalWeightLbs: Math.round(totalDivertedLbs * 100) / 100,
        totalWeightTons: Math.round((totalDivertedLbs / 2000) * 100) / 100,
        diversionRate,
        byMethod: diverted,
      },
      "gri306_5_wasteDisposed": {
        totalWeightLbs: Math.round(totalDisposedLbs * 100) / 100,
        totalWeightTons: Math.round((totalDisposedLbs / 2000) * 100) / 100,
        byMethod: disposed,
      },
    };

    if (format === "csv") {
      const rows: string[] = [];
      rows.push("GRI Disclosure,Metric,Value,Unit");
      rows.push(`306-3,Total Waste Generated,${report.gri306_3_wasteGenerated.totalWeightTons},tons`);
      rows.push(`306-3,Total Items,${totalItems},items`);
      rows.push(`306-4,Total Waste Diverted,${report.gri306_4_wasteDiverted.totalWeightTons},tons`);
      rows.push(`306-4,Diversion Rate,${diversionRate},%`);
      rows.push(`306-5,Total Waste Disposed,${report.gri306_5_wasteDisposed.totalWeightTons},tons`);

      // Add material breakdown
      rows.push("");
      rows.push("Material Type,Total (lbs),Diverted (lbs),Disposed (lbs)");
      for (const [mat, data] of Object.entries(byMaterial)) {
        rows.push(`"${mat}",${data.totalLbs.toFixed(2)},${data.divertedLbs.toFixed(2)},${data.disposedLbs.toFixed(2)}`);
      }

      // Add method breakdown
      rows.push("");
      rows.push("Diversion Method,Weight (lbs),Count");
      for (const [method, data] of Object.entries(diverted)) {
        rows.push(`"${method}",${data.weightLbs.toFixed(2)},${data.count}`);
      }
      rows.push("");
      rows.push("Disposal Method,Weight (lbs),Count");
      for (const [method, data] of Object.entries(disposed)) {
        rows.push(`"${method}",${data.weightLbs.toFixed(2)},${data.count}`);
      }

      const csv = rows.join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="gri306-report-${clientId}.csv"`,
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
