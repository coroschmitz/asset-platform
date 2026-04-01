import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workOrder = await prisma.workOrder.findUnique({ where: { id } })
    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }
    return NextResponse.json(workOrder)
  } catch (error) {
    console.error("Get error:", error)
    return NextResponse.json({ error: "Failed to get work order" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const workOrder = await prisma.workOrder.findUnique({ where: { id } })
    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    const allowedFields = [
      "status", "jobName", "description", "scheduledDate",
      "poNumber", "costCenter", "department", "glCode",
      "nteAmount", "slaResponseDue", "slaCompletionDue",
    ]
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field]
      }
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Failed to update work order" }, { status: 500 })
  }
}
