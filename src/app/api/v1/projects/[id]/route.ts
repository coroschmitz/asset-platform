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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, fullName: true } },
        location: { select: { name: true, code: true, city: true, state: true } },
        milestones: { orderBy: { sortOrder: "asc" } },
        deliveries: { orderBy: { expectedDate: "asc" } },
        workOrders: {
          select: {
            id: true,
            orderNumber: true,
            requestType: true,
            status: true,
            scheduledDate: true,
            completedDate: true,
            totalCost: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: project })
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

    const allowedFields = [
      "name", "description", "projectType", "status", "startDate", "targetDate",
      "completedDate", "budget", "actualCost", "locationId", "generalContractor",
      "projectManager", "totalItems", "receivedItems", "installedItems",
    ]

    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (["startDate", "targetDate", "completedDate"].includes(field) && body[field]) {
          data[field] = new Date(body[field])
        } else {
          data[field] = body[field]
        }
      }
    }

    // Auto-calculate status based on milestones if not explicitly set
    if (!body.status) {
      const milestones = await prisma.projectMilestone.findMany({
        where: { projectId: id },
      })

      if (milestones.length > 0) {
        const allComplete = milestones.every((m) => m.status === "COMPLETED")
        const anyInProgress = milestones.some((m) => m.status === "IN_PROGRESS")

        if (allComplete) {
          data.status = "COMPLETE"
          data.completedDate = new Date()
        } else if (anyInProgress) {
          data.status = "IN_PROGRESS"
        }
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        client: { select: { name: true } },
        location: { select: { name: true, code: true } },
      },
    })

    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
