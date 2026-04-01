import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const { assignments } = body

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { success: false, error: "assignments array is required" },
        { status: 400 }
      )
    }

    let assigned = 0
    const notFound: string[] = []
    const errors: string[] = []

    for (const entry of assignments) {
      const { tagNumber, tagId, epc } = entry
      if (!tagNumber || !tagId || !epc) {
        errors.push(`Missing fields for tagNumber=${tagNumber}`)
        continue
      }

      const asset = await prisma.asset.findFirst({
        where: { tagNumber },
        select: { id: true },
      })

      if (!asset) {
        notFound.push(tagNumber)
        continue
      }

      try {
        await prisma.rfidTagAssignment.create({
          data: {
            assetId: asset.id,
            tagId,
            epc,
            tagType: "UHF_PASSIVE",
            isActive: true,
          },
        })

        await prisma.asset.update({
          where: { id: asset.id },
          data: { rfidTagId: tagId, rfidEpc: epc },
        })

        assigned++
      } catch (e) {
        errors.push(`Failed to assign ${tagNumber}: ${e instanceof Error ? e.message : "unknown"}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: { assigned, notFound, errors },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
