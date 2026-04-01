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

    const reader = await prisma.rfidReader.findUnique({
      where: { id },
      include: {
        location: { select: { name: true, code: true, city: true, state: true } },
        events: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            asset: { select: { id: true, tagNumber: true, description: true } },
          },
        },
        _count: { select: { events: true } },
      },
    })

    if (!reader) {
      return NextResponse.json({ success: false, error: "Reader not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: reader })
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

    const allowedFields = ["name", "readerType", "zone", "ipAddress", "serialNumber", "antennaCount", "isActive"]
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field]
    }

    const reader = await prisma.rfidReader.update({
      where: { id },
      data,
      include: { location: { select: { name: true, code: true } } },
    })

    return NextResponse.json({ success: true, data: reader })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

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

    const reader = await prisma.rfidReader.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: reader })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
