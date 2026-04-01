import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const { id } = await params

    const reader = await prisma.rfidReader.update({
      where: { id },
      data: { lastHeartbeat: new Date() },
      select: {
        id: true,
        name: true,
        readerType: true,
        zone: true,
        antennaCount: true,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: reader })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
