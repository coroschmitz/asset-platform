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

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { name: true, fullName: true } },
        location: { select: { name: true, code: true, city: true, state: true } },
        _count: { select: { milestones: true, deliveries: true, workOrders: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const data = projects.map((p) => ({
      ...p,
      receivedPercent: p.totalItems > 0 ? Math.round((p.receivedItems / p.totalItems) * 1000) / 10 : 0,
      installedPercent: p.totalItems > 0 ? Math.round((p.installedItems / p.totalItems) * 1000) / 10 : 0,
      budgetPercent: p.budget && p.budget > 0 ? Math.round(((p.actualCost || 0) / p.budget) * 1000) / 10 : 0,
    }))

    return NextResponse.json({ success: true, data })
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

    if (!body.clientId || !body.name || !body.projectType) {
      return NextResponse.json(
        { success: false, error: "clientId, name, and projectType are required" },
        { status: 400 }
      )
    }

    // Auto-generate project number
    const year = new Date().getFullYear()
    const lastProject = await prisma.project.findFirst({
      where: { projectNumber: { startsWith: `PRJ-${year}-` } },
      orderBy: { projectNumber: "desc" },
      select: { projectNumber: true },
    })

    let seq = 1
    if (lastProject) {
      const parts = lastProject.projectNumber.split("-")
      seq = (parseInt(parts[2], 10) || 0) + 1
    }

    const projectNumber = `PRJ-${year}-${String(seq).padStart(3, "0")}`

    const project = await prisma.project.create({
      data: {
        clientId: body.clientId,
        name: body.name,
        projectNumber,
        description: body.description || null,
        projectType: body.projectType,
        status: body.status || "PLANNING",
        startDate: body.startDate ? new Date(body.startDate) : null,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        budget: body.budget ?? null,
        locationId: body.locationId || null,
        generalContractor: body.generalContractor || null,
        projectManager: body.projectManager || null,
        totalItems: body.totalItems || 0,
      },
      include: {
        client: { select: { name: true } },
        location: { select: { name: true, code: true } },
      },
    })

    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
