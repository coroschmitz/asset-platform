import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const { id } = await params

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        client: true,
        partner: true,
        fromLocation: true,
        toLocation: true,
        createdBy: { select: { name: true, email: true } },
        items: {
          include: {
            asset: { select: { tagNumber: true, description: true, type: true, category: true } },
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 })
    }

    // Generate a simple HTML-based work ticket (can be printed to PDF by browser)
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Work Ticket - ${workOrder.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #ea580c; padding-bottom: 10px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #ea580c; }
    .section { margin-bottom: 15px; }
    .section-title { font-size: 14px; font-weight: bold; background: #f3f4f6; padding: 5px 10px; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; }
    .label { color: #6b7280; font-size: 11px; }
    .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 5px; }
    th, td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; font-size: 11px; }
    th { background: #f3f4f6; font-weight: 600; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .sig-line { border-top: 1px solid #000; padding-top: 5px; margin-top: 40px; font-size: 11px; }
    .priority-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
    .priority-URGENT { background: #fee2e2; color: #dc2626; }
    .priority-HIGH { background: #ffedd5; color: #ea580c; }
    .priority-MEDIUM { background: #dbeafe; color: #2563eb; }
    .priority-LOW { background: #f3f4f6; color: #6b7280; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">COROVAN</div>
      <div style="color: #6b7280; font-size: 11px;">Moving & Storage | Asset Management</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 18px; font-weight: bold;">${workOrder.orderNumber}</div>
      <div class="priority-badge priority-${workOrder.priority}">${workOrder.priority}</div>
      <div style="margin-top: 5px; color: #6b7280;">${workOrder.status.replace(/_/g, " ")}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Work Order Details</div>
    <div class="grid">
      <div><span class="label">Request Type:</span> <span class="value">${workOrder.requestType}${workOrder.requestCategory ? ` - ${workOrder.requestCategory}` : ""}</span></div>
      <div><span class="label">Job Name:</span> <span class="value">${workOrder.jobName || "—"}</span></div>
      <div><span class="label">Request Date:</span> <span class="value">${workOrder.requestDate.toLocaleDateString()}</span></div>
      <div><span class="label">Scheduled:</span> <span class="value">${workOrder.scheduledDate?.toLocaleDateString() || "TBD"}</span></div>
      <div><span class="label">Requested By:</span> <span class="value">${workOrder.requestedBy}</span></div>
      <div><span class="label">Onsite Contact:</span> <span class="value">${workOrder.onsiteContact || "—"} ${workOrder.onsitePhone || ""}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Client & Partner</div>
    <div class="grid">
      <div><span class="label">Client:</span> <span class="value">${workOrder.client.fullName}</span></div>
      <div><span class="label">FM Company:</span> <span class="value">${workOrder.client.fmCompany || "—"}</span></div>
      <div><span class="label">Partner:</span> <span class="value">${workOrder.partner?.name || "Corovan Direct"}</span></div>
      <div><span class="label">Contact:</span> <span class="value">${workOrder.partner?.contactName || "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Locations</div>
    <div class="grid">
      <div>
        <div class="label">FROM:</div>
        <div class="value">${workOrder.fromLocation?.name || "—"}</div>
        <div>${workOrder.fromLocation ? `${workOrder.fromLocation.city}, ${workOrder.fromLocation.state}` : ""}</div>
        ${workOrder.fromDetail ? `<div style="color: #6b7280;">${workOrder.fromDetail}</div>` : ""}
      </div>
      <div>
        <div class="label">TO:</div>
        <div class="value">${workOrder.toLocation?.name || "—"}</div>
        <div>${workOrder.toLocation ? `${workOrder.toLocation.city}, ${workOrder.toLocation.state}` : ""}</div>
        ${workOrder.toDetail ? `<div style="color: #6b7280;">${workOrder.toDetail}</div>` : ""}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Items (${workOrder.items.length})</div>
    <table>
      <thead>
        <tr>
          <th>Tag #</th>
          <th>Description</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${workOrder.items.map((item) => `
        <tr>
          <td>${item.asset.tagNumber}</td>
          <td>${item.asset.description}</td>
          <td>${item.asset.type}</td>
          <td>${item.quantity}</td>
          <td>${item.notes || ""}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Billing Information</div>
    <div class="grid">
      <div><span class="label">PO Number:</span> <span class="value">${workOrder.poNumber || "—"}</span></div>
      <div><span class="label">Cost Center:</span> <span class="value">${workOrder.costCenter || "—"}</span></div>
      <div><span class="label">Department:</span> <span class="value">${workOrder.department || "—"}</span></div>
      <div><span class="label">GL Code:</span> <span class="value">${workOrder.glCode || "—"}</span></div>
    </div>
  </div>

  ${workOrder.description ? `
  <div class="section">
    <div class="section-title">Special Instructions</div>
    <p>${workOrder.description}</p>
  </div>` : ""}

  <div class="signatures">
    <div>
      <div class="sig-line">Crew Lead Signature / Date</div>
    </div>
    <div>
      <div class="sig-line">Onsite Contact Signature / Date</div>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
