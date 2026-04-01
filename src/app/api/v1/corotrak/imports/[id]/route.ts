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

    const importRecord = await prisma.coroTrakImport.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, fullName: true } },
        moves: true,
      },
    })

    if (!importRecord) {
      return NextResponse.json({ success: false, error: "Import not found" }, { status: 404 })
    }

    const statusBreakdown = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    }
    let rfidVerifiedCount = 0
    for (const move of importRecord.moves) {
      const s = move.status as keyof typeof statusBreakdown
      if (s in statusBreakdown) statusBreakdown[s]++
      if (move.rfidVerified) rfidVerifiedCount++
    }

    return NextResponse.json({
      success: true,
      data: {
        ...importRecord,
        summary: {
          statusBreakdown,
          rfidVerifiedCount,
          rfidUnverifiedCount: importRecord.moves.length - rfidVerifiedCount,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.status) {
      return NextResponse.json({ success: false, error: "status is required" }, { status: 400 })
    }

    const updated = await prisma.coroTrakImport.update({
      where: { id },
      data: { status: body.status },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
