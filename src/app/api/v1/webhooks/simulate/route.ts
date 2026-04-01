import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const JOB_NAMES = [
  "Emergency Desk Deployment",
  "3rd Floor Restack",
  "Executive Suite Reconfigure",
  "Lab Equipment Relocation",
  "Conference Room Refresh",
  "Building Decommission Phase 1",
  "New Hire Workstation Setup",
  "Warehouse Consolidation",
  "Seismic Compliance FF&E Move",
  "IT Infrastructure Relocation",
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomId(prefix: string, digits: number): string {
  return `${prefix}${String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, "0")}`
}

type Platform = "corrigo" | "servicenow" | "cbre" | "cushman"

function buildPayload(
  platform: Platform,
  loc: { name: string; city: string; state: string; code: string },
  jobName: string
) {
  switch (platform) {
    case "corrigo":
      return {
        WorkOrder: {
          Number: randomId("WO", 7),
          Description: jobName,
          PriorityId: pick([1, 2, 3, 4, 5]),
          Space: { Address: `${loc.name}, ${loc.city}`, City: loc.city, State: loc.state },
          CustomFields: {
            PurchaseOrder: randomId("PO-", 6),
            CostCenter: pick(["CC-1000", "CC-2000", "CC-3000", "CC-4500"]),
          },
        },
      }
    case "servicenow":
      return {
        number: randomId("TASK", 7),
        short_description: jobName,
        description: `${jobName} – ${loc.name}, ${loc.city}, ${loc.state}`,
        priority: pick([1, 2, 3, 4]),
        location: { name: loc.name, city: loc.city, state: loc.state },
        variables: {
          po_number: randomId("PO-", 6),
          cost_center: pick(["DEPT-100", "DEPT-200", "DEPT-300"]),
        },
      }
    case "cbre":
      return {
        workOrderId: randomId("NX-", 8),
        description: jobName,
        priority: pick(["Critical", "High", "Normal", "Low"]),
        siteId: loc.code,
        siteName: `${loc.name} – ${loc.city}, ${loc.state}`,
        costCode: pick(["GL-5100", "GL-5200", "GL-5300"]),
      }
    case "cushman":
      return {
        requestId: randomId("CW", 8),
        summary: jobName,
        details: `${jobName} at ${loc.name}, ${loc.city}, ${loc.state}`,
        urgency: pick(["Emergency", "Urgent", "Standard", "Low"]),
        buildingCode: loc.code,
        buildingName: `${loc.name} – ${loc.city}, ${loc.state}`,
        billingReference: randomId("PO-", 6),
      }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const platform = body.platform as Platform
    if (!["corrigo", "servicenow", "cbre", "cushman"].includes(platform)) {
      return NextResponse.json({ success: false, error: "Invalid platform. Use: corrigo, servicenow, cbre, cushman" }, { status: 400 })
    }

    // Get a random location with its client
    const count = await prisma.location.count({ where: { isActive: true } })
    const skip = Math.floor(Math.random() * count)
    const location = await prisma.location.findFirst({
      where: { isActive: true },
      skip,
      include: { client: true },
    })
    if (!location) return NextResponse.json({ success: false, error: "No locations found" }, { status: 500 })

    const jobName = pick(JOB_NAMES)
    const simulatedPayload = buildPayload(platform, {
      name: location.name,
      city: location.city,
      state: location.state,
      code: location.code,
    }, jobName)

    // Post to the internal webhook endpoint
    const origin = new URL(request.url).origin
    const webhookUrl = `${origin}/api/v1/webhooks/${platform}`
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simulatedPayload),
    })

    const webhookData = await webhookRes.json()

    return NextResponse.json({
      success: true,
      platform,
      workOrderId: webhookData.workOrderId || null,
      simulatedPayload,
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}
