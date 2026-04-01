import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

function normalizeCondition(val: string): string {
  const map: Record<string, string> = {
    excellent: "EXCELLENT", exc: "EXCELLENT", e: "EXCELLENT",
    good: "GOOD", g: "GOOD",
    fair: "FAIR", f: "FAIR",
    poor: "POOR", p: "POOR",
    damaged: "DAMAGED", dmg: "DAMAGED", d: "DAMAGED",
  };
  return map[val?.toLowerCase()] || "GOOD";
}

function normalizeStatus(val: string): string {
  const map: Record<string, string> = {
    "in storage": "IN_STORAGE", in_storage: "IN_STORAGE", storage: "IN_STORAGE",
    deployed: "DEPLOYED", deploy: "DEPLOYED",
    available: "AVAILABLE", avail: "AVAILABLE",
    reserved: "RESERVED",
    "in transit": "IN_TRANSIT", in_transit: "IN_TRANSIT", transit: "IN_TRANSIT",
    decommissioned: "DECOMMISSIONED", decom: "DECOMMISSIONED",
  };
  return map[val?.toLowerCase()] || "IN_STORAGE";
}

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { rows, mapping, clientId } = body;

    if (!rows || !Array.isArray(rows) || !mapping || !clientId) {
      return NextResponse.json(
        { success: false, error: "rows, mapping, and clientId are required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    const locations = await prisma.location.findMany({
      where: { clientId },
      select: { id: true, city: true, state: true, name: true },
    });

    let created = 0;
    let updated = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const getValue = (field: string) => {
          const sourceCol = mapping[field];
          return sourceCol ? row[sourceCol] : undefined;
        };

        const tagNumber = getValue("tagNumber");
        if (!tagNumber) {
          errors.push({ row: i, error: "Missing tagNumber" });
          continue;
        }

        const city = getValue("city");
        let locationId: string | undefined;
        if (city) {
          const loc = locations.find(
            (l) => l.city.toLowerCase() === city.toLowerCase()
          );
          if (loc) locationId = loc.id;
        }
        if (!locationId && locations.length > 0) {
          locationId = locations[0].id;
        }
        if (!locationId) {
          errors.push({ row: i, error: "No matching location found" });
          continue;
        }

        const data = {
          clientId,
          locationId,
          tagNumber: String(tagNumber),
          description: getValue("description") || "",
          type: getValue("type") || "Furniture",
          category: getValue("category") || "General",
          serialNumber: getValue("serialNumber") || undefined,
          manufacturer: getValue("manufacturer") || undefined,
          modelNumber: getValue("modelNumber") || undefined,
          condition: normalizeCondition(getValue("condition") || "Good") as "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED",
          status: normalizeStatus(getValue("status") || "In Storage") as "IN_STORAGE" | "DEPLOYED" | "AVAILABLE" | "RESERVED" | "IN_TRANSIT" | "DECOMMISSIONED",
          quantity: parseInt(getValue("quantity") || "1", 10) || 1,
          originalCost: getValue("originalCost") ? parseFloat(getValue("originalCost")) : undefined,
          currentValue: getValue("currentValue") ? parseFloat(getValue("currentValue")) : undefined,
          primaryColor: getValue("primaryColor") || undefined,
          primaryMaterial: getValue("primaryMaterial") || undefined,
          width: getValue("width") ? parseFloat(getValue("width")) : undefined,
          height: getValue("height") ? parseFloat(getValue("height")) : undefined,
          depth: getValue("depth") ? parseFloat(getValue("depth")) : undefined,
        };

        const existing = await prisma.asset.findFirst({
          where: { tagNumber: String(tagNumber), clientId },
        });

        if (existing) {
          await prisma.asset.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.asset.create({ data });
          created++;
        }
      } catch (err) {
        errors.push({ row: i, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, updated, errors },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
