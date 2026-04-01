import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const clientId = formData.get("clientId") as string | null
    const workOrderNumber = formData.get("workOrderNumber") as string | null

    if (!file || !clientId || !workOrderNumber) {
      return NextResponse.json(
        { success: false, error: "file, clientId, and workOrderNumber are required" },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) {
      return NextResponse.json({ success: false, error: "No sheet found in workbook" }, { status: 400 })
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Spreadsheet has no data rows" }, { status: 400 })
    }

    const headerMap: Record<string, string> = {
      "First Name": "firstName",
      "Last Name": "lastName",
      "Employee Number": "employeeNumber",
      "Origin Location": "originLocation",
      "Origin Floor": "originFloor",
      "Origin Room": "originRoom",
      "Destination Location": "destLocation",
      "Destination Floor": "destFloor",
      "Destination Room": "destRoom",
      "Number Of Work Items": "workItemCount",
    }

    const moves: {
      firstName: string
      lastName: string
      employeeNumber: string
      originLocation: string
      originFloor: string
      originRoom: string
      destLocation: string
      destFloor: string
      destRoom: string
      workItemCount: number
      isStorage: boolean
      isInterBuilding: boolean
    }[] = []

    for (const row of rows) {
      const mapped: Record<string, unknown> = {}
      for (const [excelHeader, fieldName] of Object.entries(headerMap)) {
        mapped[fieldName] = row[excelHeader] ?? ""
      }

      const destRoom = String(mapped.destRoom || "")
      const destFloor = String(mapped.destFloor || "")
      const originLoc = String(mapped.originLocation || "")
      const destLoc = String(mapped.destLocation || "")

      moves.push({
        firstName: String(mapped.firstName || ""),
        lastName: String(mapped.lastName || ""),
        employeeNumber: String(mapped.employeeNumber || ""),
        originLocation: originLoc,
        originFloor: String(mapped.originFloor || ""),
        originRoom: String(mapped.originRoom || ""),
        destLocation: destLoc,
        destFloor: destFloor,
        destRoom: destRoom,
        workItemCount: Number(mapped.workItemCount) || 10,
        isStorage: destRoom === "STORAGE" || destFloor === "STORAGE",
        isInterBuilding: originLoc !== destLoc,
      })
    }

    const originBuildings = [...new Set(moves.map((m) => m.originLocation).filter(Boolean))]
    const destBuildings = [...new Set(moves.map((m) => m.destLocation).filter(Boolean))]
    const totalWorkItems = moves.reduce((sum, m) => sum + m.workItemCount, 0)
    const storageCount = moves.filter((m) => m.isStorage).length
    const interBuildingCount = moves.filter((m) => m.isInterBuilding).length
    const intraBuildingCount = moves.filter((m) => !m.isInterBuilding && !m.isStorage).length

    const coroImport = await prisma.coroTrakImport.create({
      data: {
        clientId,
        workOrderNumber,
        fileName: file.name,
        totalPersonMoves: moves.length,
        totalWorkItems,
        originBuildings,
        destBuildings,
        storageCount,
        interBuildingCount,
        intraBuildingCount,
        status: "IMPORTED",
      },
    })

    // Batch create moves in chunks
    const CHUNK_SIZE = 100
    for (let i = 0; i < moves.length; i += CHUNK_SIZE) {
      const chunk = moves.slice(i, i + CHUNK_SIZE)
      await prisma.coroTrakMove.createMany({
        data: chunk.map((m) => ({
          importId: coroImport.id,
          firstName: m.firstName,
          lastName: m.lastName,
          employeeNumber: m.employeeNumber,
          originLocation: m.originLocation,
          originFloor: m.originFloor,
          originRoom: m.originRoom,
          destLocation: m.destLocation,
          destFloor: m.destFloor,
          destRoom: m.destRoom,
          workItemCount: m.workItemCount,
          isStorage: m.isStorage,
          isInterBuilding: m.isInterBuilding,
          status: "PENDING",
        })),
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        importId: coroImport.id,
        totalPersonMoves: moves.length,
        totalWorkItems,
        storageCount,
        interBuildingCount,
        intraBuildingCount,
        buildings: { origin: originBuildings, destination: destBuildings },
      },
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
