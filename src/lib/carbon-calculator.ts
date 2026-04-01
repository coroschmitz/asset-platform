import { prisma } from "@/lib/prisma";

/**
 * Carbon Calculator Utility
 *
 * Uses EPA WARM emission factors to calculate CO2 avoided
 * based on material type and disposition method.
 *
 * Formula: carbonAvoidedLbs = (weightLbs / 2000) * co2PerTonLbs
 */

export interface CarbonResult {
  carbonAvoidedLbs: number;
  emissionFactor: {
    materialType: string;
    dispositionMethod: string;
    co2PerTonLbs: number;
    source: string;
    year: number;
  } | null;
}

/**
 * Calculate carbon avoided for a given material type, disposition method, and weight.
 *
 * @param materialType - The type of material (e.g., "Steel", "Wood", "Electronics")
 * @param dispositionMethod - The disposition method (e.g., "recycled", "landfilled")
 * @param weightLbs - Weight in pounds
 * @returns CarbonResult with the calculated carbonAvoidedLbs and the emission factor used
 */
export async function calculateCarbonAvoided(
  materialType: string,
  dispositionMethod: string,
  weightLbs: number
): Promise<CarbonResult> {
  const factor = await prisma.emissionFactor.findUnique({
    where: {
      materialType_dispositionMethod: {
        materialType,
        dispositionMethod,
      },
    },
  });

  if (!factor) {
    return {
      carbonAvoidedLbs: 0,
      emissionFactor: null,
    };
  }

  // Convert weight from lbs to tons, then multiply by CO2 per ton
  const carbonAvoidedLbs = (weightLbs / 2000) * factor.co2PerTonLbs;

  return {
    carbonAvoidedLbs: Math.round(carbonAvoidedLbs * 100) / 100,
    emissionFactor: {
      materialType: factor.materialType,
      dispositionMethod: factor.dispositionMethod,
      co2PerTonLbs: factor.co2PerTonLbs,
      source: factor.source,
      year: factor.year,
    },
  };
}
