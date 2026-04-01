import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const workOrderId = formData.get("workOrderId") as string
    const uploadedById = formData.get("uploadedById") as string

    if (!files.length) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 })
    }

    if (!workOrderId) {
      return NextResponse.json({ success: false, error: "workOrderId required" }, { status: 400 })
    }

    const uploadDir = join(process.cwd(), "public", "uploads", workOrderId)
    await mkdir(uploadDir, { recursive: true })

    const attachments = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      const filePath = join(uploadDir, fileName)
      await writeFile(filePath, buffer)

      const fileUrl = `/uploads/${workOrderId}/${fileName}`

      const attachment = await prisma.attachment.create({
        data: {
          workOrderId,
          fileName: file.name,
          fileUrl,
          fileSize: buffer.length,
          mimeType: file.type,
          uploadedById: uploadedById || "system",
        },
      })

      attachments.push(attachment)
    }

    return NextResponse.json({
      success: true,
      data: { attachments },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
