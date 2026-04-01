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
        client: { select: { name: true, fullName: true } },
        partner: { select: { name: true } },
        fromLocation: { select: { name: true, city: true, state: true } },
        toLocation: { select: { name: true, city: true, state: true } },
        items: {
          include: {
            asset: {
              select: { tagNumber: true, description: true, type: true, width: true, height: true, depth: true },
            },
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ success: false, error: "Work order not found" }, { status: 404 })
    }

    const totalItems = workOrder.items.reduce((sum, i) => sum + i.quantity, 0)

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Packing List - ${workOrder.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
    .header { border-bottom: 3px solid #ea580c; padding-bottom: 10px; margin-bottom: 15px; }
    .logo { font-size: 24px; font-weight: bold; color: #ea580c; display: inline; }
    .title { font-size: 18px; font-weight: bold; float: right; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
    .info-box { border: 1px solid #d1d5db; padding: 8px; border-radius: 4px; }
    .info-label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
    .info-value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 11px; }
    th { background: #f3f4f6; font-weight: 600; }
    .checkbox { width: 18px; height: 18px; border: 2px solid #9ca3af; display: inline-block; }
    .summary { margin-top: 15px; font-size: 13px; font-weight: bold; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <span class="logo">COROVAN</span>
    <span class="title">PACKING LIST</span>
    <div style="clear: both;"></div>
    <div style="color: #6b7280; font-size: 11px;">Work Order: ${workOrder.orderNumber} | ${workOrder.requestType}</div>
  </div>

  <div class="info">
    <div class="info-box">
      <div class="info-label">From</div>
      <div class="info-value">${workOrder.fromLocation?.name || "—"}</div>
      <div>${workOrder.fromLocation ? `${workOrder.fromLocation.city}, ${workOrder.fromLocation.state}` : ""}</div>
    </div>
    <div class="info-box">
      <div class="info-label">To</div>
      <div class="info-value">${workOrder.toLocation?.name || "—"}</div>
      <div>${workOrder.toLocation ? `${workOrder.toLocation.city}, ${workOrder.toLocation.state}` : ""}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Client</div>
      <div class="info-value">${workOrder.client.fullName}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Partner</div>
      <div class="info-value">${workOrder.partner?.name || "Corovan Direct"}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">✓</th>
        <th>Tag #</th>
        <th>Description</th>
        <th>Type</th>
        <th>Dims (WxHxD)</th>
        <th style="width: 40px;">Qty</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${workOrder.items.map((item) => {
        const dims = [item.asset.width, item.asset.height, item.asset.depth].filter(Boolean).join("x")
        return `
      <tr>
        <td style="text-align: center;"><div class="checkbox"></div></td>
        <td style="font-family: monospace;">${item.asset.tagNumber}</td>
        <td>${item.asset.description}</td>
        <td>${item.asset.type}</td>
        <td>${dims || "—"}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td>${item.notes || ""}</td>
      </tr>`
      }).join("")}
    </tbody>
  </table>

  <div class="summary">Total Items: ${totalItems} | Total Lines: ${workOrder.items.length}</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
