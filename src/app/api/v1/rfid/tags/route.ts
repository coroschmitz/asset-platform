import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const url = request.nextUrl
    const isActive = url.searchParams.get("isActive")

    const where: Record<string, unknown> = {}
    if (isActive === "true") where.isActive = true
    if (isActive === "false") where.isActive = false

    const tags = await prisma.rfidTagAssignment.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            tagNumber: true,
            description: true,
            type: true,
            locationId: true,
            location: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    })

    return NextResponse.json({ success: true, data: tags })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const { assetId, tagId, epc, tagType } = body

    if (!assetId || !tagId || !epc) {
      return NextResponse.json(
        { success: false, error: "assetId, tagId, and epc are required" },
        { status: 400 }
      )
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 })
    }

    const assignment = await prisma.rfidTagAssignment.create({
      data: {
        assetId,
        tagId,
        epc,
        tagType: tagType || "UHF_PASSIVE",
        isActive: true,
      },
    })

    await prisma.asset.update({
      where: { id: assetId },
      data: { rfidTagId: tagId, rfidEpc: epc },
    })

    return NextResponse.json({ success: true, data: assignment }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
