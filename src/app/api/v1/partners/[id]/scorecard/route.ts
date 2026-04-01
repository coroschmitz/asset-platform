import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

function toStarRating(pct: number): number {
  if (pct >= 95) return 5;
  if (pct >= 85) return 4;
  if (pct >= 70) return 3;
  if (pct >= 50) return 2;
  return 1;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id } = await params;

    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });
    }

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const scorecard = await prisma.partnerScorecard.findUnique({
      where: { partnerId_period: { partnerId: id, period } },
    });

    const workOrders = await prisma.workOrder.findMany({
      where: { partnerId: id },
      select: {
        status: true,
        slaResponseDue: true,
        slaCompletionDue: true,
        respondedAt: true,
        completedDate: true,
        createdAt: true,
      },
    });

    const total = workOrders.length;
    const completed = workOrders.filter((wo) => wo.status === "COMPLETED");

    let onTimeResponse = 0;
    let onTimeCompletion = 0;
    let totalResponseTime = 0;
    let totalCompletionTime = 0;
    let responseCount = 0;
    let completionCount = 0;

    for (const wo of workOrders) {
      if (wo.respondedAt && wo.slaResponseDue) {
        if (wo.respondedAt <= wo.slaResponseDue) onTimeResponse++;
        totalResponseTime += wo.respondedAt.getTime() - wo.createdAt.getTime();
        responseCount++;
      }
      if (wo.completedDate && wo.slaCompletionDue) {
        if (wo.completedDate <= wo.slaCompletionDue) onTimeCompletion++;
        totalCompletionTime += wo.completedDate.getTime() - wo.createdAt.getTime();
        completionCount++;
      }
    }

    const onTimeDeliveryRate = completionCount > 0 ? (onTimeCompletion / completionCount) * 100 : 100;
    const avgResponseTimeHrs = responseCount > 0 ? totalResponseTime / responseCount / 3600000 : 0;
    const avgCompletionTimeHrs = completionCount > 0 ? totalCompletionTime / completionCount / 3600000 : 0;
    const slaComplianceRate = total > 0 ? ((onTimeResponse + onTimeCompletion) / (Math.max(responseCount, 1) + Math.max(completionCount, 1))) * 100 : 100;

    const qualityPct = scorecard?.qualityScore || onTimeDeliveryRate;
    const commPct = scorecard?.communicationScore || (responseCount > 0 ? (onTimeResponse / responseCount) * 100 : 100);
    const custSat = scorecard?.overallScore || onTimeDeliveryRate;

    const cbreRating = {
      timeOfDelivery: toStarRating(onTimeDeliveryRate),
      communication: toStarRating(commPct),
      qualityOfProducts: toStarRating(qualityPct),
      qualityOfService: toStarRating(custSat),
      overallRecommendation: toStarRating((onTimeDeliveryRate + commPct + qualityPct + custSat) / 4),
    };

    return NextResponse.json({
      success: true,
      data: {
        scorecard,
        liveMetrics: {
          totalWorkOrders: total,
          completedWorkOrders: completed.length,
          onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
          avgResponseTimeHrs: Math.round(avgResponseTimeHrs * 100) / 100,
          avgCompletionTimeHrs: Math.round(avgCompletionTimeHrs * 100) / 100,
          slaComplianceRate: Math.round(slaComplianceRate * 100) / 100,
        },
        cbreRating,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
