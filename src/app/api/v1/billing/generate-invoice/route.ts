import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { workOrderIds } = body;

    if (!workOrderIds || !Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "workOrderIds array is required" },
        { status: 400 }
      );
    }

    const workOrders = await prisma.workOrder.findMany({
      where: { id: { in: workOrderIds } },
      include: { client: { select: { name: true } } },
    });

    if (workOrders.length !== workOrderIds.length) {
      return NextResponse.json(
        { success: false, error: "Some work order IDs not found" },
        { status: 400 }
      );
    }

    const nonCompleted = workOrders.filter((wo) => wo.status !== "COMPLETED");
    if (nonCompleted.length > 0) {
      return NextResponse.json(
        { success: false, error: `Work orders must be COMPLETED: ${nonCompleted.map((wo) => wo.orderNumber).join(", ")}` },
        { status: 400 }
      );
    }

    const alreadyInvoiced = workOrders.filter((wo) => wo.invoiceNumber);
    if (alreadyInvoiced.length > 0) {
      return NextResponse.json(
        { success: false, error: `Work orders already invoiced: ${alreadyInvoiced.map((wo) => wo.orderNumber).join(", ")}` },
        { status: 400 }
      );
    }

    const clientIds = new Set(workOrders.map((wo) => wo.clientId));
    if (clientIds.size > 1) {
      return NextResponse.json(
        { success: false, error: "All work orders must belong to the same client" },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const lastInvoice = await prisma.workOrder.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${year}` } },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });

    let nextNum = 1;
    if (lastInvoice?.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split("-");
      nextNum = parseInt(parts[2] || "0", 10) + 1;
    }
    const invoiceNumber = `INV-${year}-${String(nextNum).padStart(4, "0")}`;

    const totalLaborCost = workOrders.reduce((sum, wo) => sum + (wo.actualHours || 0) * (wo.laborRate || 75), 0);
    const totalMaterialCost = workOrders.reduce((sum, wo) => sum + (wo.materialCost || 0), 0);
    const totalAmount = workOrders.reduce((sum, wo) => sum + (wo.totalCost || 0), 0);

    const now = new Date();
    await prisma.workOrder.updateMany({
      where: { id: { in: workOrderIds } },
      data: { invoiceNumber, invoicedAt: now },
    });

    return NextResponse.json({
      success: true,
      data: {
        invoiceNumber,
        clientName: workOrders[0].client.name,
        workOrderCount: workOrders.length,
        totalLaborCost: Math.round(totalLaborCost * 100) / 100,
        totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        invoicedAt: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
