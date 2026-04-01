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
    const clientId = url.searchParams.get("clientId") || undefined
    const status = url.searchParams.get("status") || undefined

    const where: Record<string, unknown> = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const imports = await prisma.coroTrakImport.findMany({
      where,
      include: {
        client: { select: { name: true, fullName: true } },
        _count: { select: { moves: true } },
      },
      orderBy: { importedAt: "desc" },
    })

    return NextResponse.json({ success: true, data: imports })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
