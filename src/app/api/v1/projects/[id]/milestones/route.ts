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

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: milestones })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

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
    const body = await request.json()

    if (!body.name || !body.targetDate) {
      return NextResponse.json(
        { success: false, error: "name and targetDate are required" },
        { status: 400 }
      )
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: id,
        name: body.name,
        description: body.description || null,
        targetDate: new Date(body.targetDate),
        dependsOn: body.dependsOn || null,
        sortOrder: body.sortOrder ?? 0,
        status: "PENDING",
      },
    })

    return NextResponse.json({ success: true, data: milestone }, { status: 201 })
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

    const { id: projectId } = await params
    const body = await request.json()

    if (!body.milestoneId) {
      return NextResponse.json(
        { success: false, error: "milestoneId is required" },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.targetDate !== undefined) data.targetDate = new Date(body.targetDate)
    if (body.dependsOn !== undefined) data.dependsOn = body.dependsOn
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    if (body.status !== undefined) data.status = body.status
    if (body.completedDate !== undefined) {
      data.completedDate = body.completedDate ? new Date(body.completedDate) : null
    }

    // If marking as completed, set completedDate
    if (body.status === "COMPLETED" && !body.completedDate) {
      data.completedDate = new Date()
    }

    const milestone = await prisma.projectMilestone.update({
      where: { id: body.milestoneId },
      data,
    })

    // Check if all milestones are complete → update project status
    const allMilestones = await prisma.projectMilestone.findMany({
      where: { projectId },
    })

    if (allMilestones.length > 0 && allMilestones.every((m) => m.status === "COMPLETED")) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "COMPLETE", completedDate: new Date() },
      })
    }

    return NextResponse.json({ success: true, data: milestone })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
