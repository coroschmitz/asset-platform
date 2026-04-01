import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const { id } = await params

    const assignment = await prisma.rfidTagAssignment.findUnique({ where: { id } })
    if (!assignment) {
      return NextResponse.json({ success: false, error: "Tag assignment not found" }, { status: 404 })
    }

    await prisma.rfidTagAssignment.update({
      where: { id },
      data: { isActive: false },
    })

    await prisma.asset.update({
      where: { id: assignment.assetId },
      data: { rfidTagId: null, rfidEpc: null, lastRfidScanAt: null, lastRfidZone: null, lastRfidReaderId: null },
    })

    return NextResponse.json({ success: true, data: { deactivated: true } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
