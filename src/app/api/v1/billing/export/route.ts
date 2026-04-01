import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const format = request.nextUrl.searchParams.get("format") || "csv";

    const workOrders = await prisma.workOrder.findMany({
      where: { invoiceNumber: { not: null } },
      include: {
        client: { select: { name: true } },
        fromLocation: { select: { code: true, name: true } },
      },
      orderBy: { invoicedAt: "desc" },
    });

    let csv = "";
    const formatDate = (d: Date | null) => d ? d.toISOString().split("T")[0] : "";

    switch (format) {
      case "corrigo": {
        csv = "CorrigoWorkOrderNumber,VendorInvoiceNumber,InvoiceDate,LaborTotal,MaterialTotal,TaxAmount,InvoiceTotal\n";
        for (const wo of workOrders) {
          const labor = (wo.actualHours || 0) * (wo.laborRate || 75);
          csv += `${wo.externalId || wo.orderNumber},${wo.invoiceNumber},${formatDate(wo.invoicedAt)},${labor.toFixed(2)},${(wo.materialCost || 0).toFixed(2)},0.00,${(wo.totalCost || 0).toFixed(2)}\n`;
        }
        break;
      }
      case "cbre": {
        csv = "SupplierName,SupplierID,InvoiceReference,SiteCode,CostCode,ServiceDate,ServiceDescription,LaborAmount,MaterialAmount,TotalAmount,Currency,POReference\n";
        for (const wo of workOrders) {
          const labor = (wo.actualHours || 0) * (wo.laborRate || 75);
          csv += `Corovan,CRV-001,${wo.invoiceNumber},${wo.fromLocation?.code || ""},${wo.glCode || ""},${formatDate(wo.completedDate)},${(wo.description || "").replace(/,/g, ";")},${labor.toFixed(2)},${(wo.materialCost || 0).toFixed(2)},${(wo.totalCost || 0).toFixed(2)},USD,${wo.poNumber || ""}\n`;
        }
        break;
      }
      case "cushman": {
        csv = "VendorName,VendorID,InvoiceNumber,PropertyCode,GLAccount,ServiceDescription,ServiceDate,LaborHours,LaborRate,MaterialCost,TotalAmount,PONumber,BillingPeriod\n";
        for (const wo of workOrders) {
          const billingPeriod = wo.invoicedAt ? `${wo.invoicedAt.getFullYear()}-${String(wo.invoicedAt.getMonth() + 1).padStart(2, "0")}` : "";
          csv += `Corovan,CRV-001,${wo.invoiceNumber},${wo.fromLocation?.code || ""},${wo.glCode || ""},${(wo.description || "").replace(/,/g, ";")},${formatDate(wo.completedDate)},${wo.actualHours || 0},${wo.laborRate || 75},${(wo.materialCost || 0).toFixed(2)},${(wo.totalCost || 0).toFixed(2)},${wo.poNumber || ""},${billingPeriod}\n`;
        }
        break;
      }
      default: {
        csv = "OrderNumber,InvoiceNumber,Client,Status,CompletedDate,LaborHours,LaborRate,MaterialCost,TotalCost,PONumber\n";
        for (const wo of workOrders) {
          csv += `${wo.orderNumber},${wo.invoiceNumber},${wo.client.name},${wo.status},${formatDate(wo.completedDate)},${wo.actualHours || 0},${wo.laborRate || 75},${(wo.materialCost || 0).toFixed(2)},${(wo.totalCost || 0).toFixed(2)},${wo.poNumber || ""}\n`;
        }
        break;
      }
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="billing-export-${format}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
