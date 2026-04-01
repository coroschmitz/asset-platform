import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const JOB_NAMES = [
  "Emergency Desk Deployment",
  "3rd Floor Restack",
  "Executive Suite Reconfigure",
  "Lab Equipment Relocation",
  "Conference Room Refresh",
  "Building Decommission Phase 1",
  "Warehouse Consolidation",
  "Seismic Compliance FF&E Move",
  "New Hire Workstation Setup",
  "IT Infrastructure Relocation",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform = body.platform as string;

    if (!["corrigo", "servicenow", "cbre", "cushman"].includes(platform)) {
      return NextResponse.json(
        { success: false, error: "Platform must be one of: corrigo, servicenow, cbre, cushman" },
        { status: 400 }
      );
    }

    const location = await prisma.location.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      skip: randomInt(0, Math.max(0, (await prisma.location.count()) - 1)),
    });

    const client = await prisma.client.findFirst({ where: { isActive: true } });

    const jobName = randomItem(JOB_NAMES);
    const woNum = randomInt(100000, 999999);

    let payload: Record<string, unknown>;

    switch (platform) {
      case "corrigo":
        payload = {
          WorkOrder: {
            Id: woNum,
            Number: woNum,
            Description: jobName,
            PriorityId: randomItem([1, 2, 3, 4]),
            DtScheduled: new Date(Date.now() + 86400000 * randomInt(1, 14)).toISOString(),
            DtDue: new Date(Date.now() + 86400000 * randomInt(3, 30)).toISOString(),
            NteTotal: randomItem([500, 1000, 2500, 5000, 10000]),
            Space: {
              Name: location?.name || "Main Office",
              Address: {
                City: location?.city || "Los Angeles",
                State: location?.state || "CA",
              },
            },
            CustomFields: [
              { Name: "PONumber", Value: `PO-${randomInt(10000, 99999)}` },
              { Name: "CostCenter", Value: `CC-${randomInt(100, 999)}` },
            ],
          },
        };
        break;
      case "servicenow":
        payload = {
          result: {
            sys_id: `sys_${woNum}`,
            number: `INC${woNum}`,
            short_description: jobName,
            description: `${jobName} - Full service furniture move and installation`,
            priority: String(randomItem([1, 2, 3, 4])),
            location: { display_value: location?.name || "Corporate HQ" },
            u_po_number: `PO-${randomInt(10000, 99999)}`,
            u_cost_center: `CC-${randomInt(100, 999)}`,
          },
        };
        break;
      case "cbre":
        payload = {
          workOrderId: `WO-${woNum}`,
          description: jobName,
          priority: randomItem(["Critical", "High", "Normal", "Low"]),
          siteId: location?.code || "SITE-001",
          siteName: location?.name || "Corporate Campus",
          costCode: `GL-${randomInt(1000, 9999)}`,
          nteAmount: randomItem([500, 1000, 2500, 5000, 10000]),
        };
        break;
      case "cushman":
        payload = {
          requestId: `REQ-${woNum}`,
          summary: jobName,
          details: `${jobName} - Complete scope including packing, transport, and setup`,
          urgency: randomItem(["Emergency", "Urgent", "Standard", "Low"]),
          buildingCode: location?.code || "BLD-001",
          buildingName: location?.name || "Main Building",
          billingReference: `PO-${randomInt(10000, 99999)}`,
          nteLimit: randomItem([500, 1000, 2500, 5000, 10000]),
        };
        break;
      default:
        payload = {};
    }

    const baseUrl = request.nextUrl.origin;
    const webhookUrl = `${baseUrl}/api/v1/webhooks/${platform}`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.COROVAN_API_KEY ? { "x-api-key": process.env.COROVAN_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        platform,
        workOrderId: result.data?.workOrderId,
        orderNumber: result.data?.orderNumber,
        simulatedPayload: payload,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
