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
    const url = request.nextUrl
    const status = url.searchParams.get("status") || undefined
    const isStorage = url.searchParams.get("isStorage")
    const isInterBuilding = url.searchParams.get("isInterBuilding")
    const search = url.searchParams.get("search") || undefined
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 50))

    const where: Record<string, unknown> = { importId: id }
    if (status) where.status = status
    if (isStorage === "true") where.isStorage = true
    if (isStorage === "false") where.isStorage = false
    if (isInterBuilding === "true") where.isInterBuilding = true
    if (isInterBuilding === "false") where.isInterBuilding = false
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    const [moves, total] = await Promise.all([
      prisma.coroTrakMove.findMany({
        where,
        orderBy: { lastName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.coroTrakMove.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        moves,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
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

    await params
    const body = await request.json()

    if (!body.moveIds || !Array.isArray(body.moveIds) || !body.status) {
      return NextResponse.json(
        { success: false, error: "moveIds (array) and status are required" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { status: body.status }
    if (body.status === "COMPLETED") {
      updateData.completedAt = new Date()
    }

    const result = await prisma.coroTrakMove.updateMany({
      where: { id: { in: body.moveIds } },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: { updated: result.count } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
