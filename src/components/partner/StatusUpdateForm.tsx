"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface StatusUpdateFormProps {
  workOrderId: string
  currentStatus: string
  partnerId: string
}

export default function StatusUpdateForm({
  workOrderId,
  currentStatus,
  partnerId,
}: StatusUpdateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState("")

  async function handleStatusAction() {
    setLoading(true)
    try {
      if (currentStatus === "APPROVED") {
        await fetch(`/api/v1/work-orders/${workOrderId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SCHEDULED", notes: notes || undefined }),
        })
        router.refresh()
      } else if (currentStatus === "SCHEDULED") {
        let gpsLat: number | null = null
        let gpsLng: number | null = null
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          )
          gpsLat = pos.coords.latitude
          gpsLng = pos.coords.longitude
        } catch {
          // GPS not available, proceed without
        }
        await fetch(`/api/v1/work-orders/${workOrderId}/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gpsLat, gpsLng, notes: notes || undefined }),
        })
        router.refresh()
      } else if (currentStatus === "IN_PROGRESS") {
        router.push(`/partner/orders/${workOrderId}/complete?pid=${partnerId}`)
      }
    } catch (error) {
      console.error("Action failed:", error)
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus === "COMPLETED") {
    return (
      <div className="py-4 text-center">
        <p className="text-lg font-semibold text-green-600">✓ Job Complete</p>
      </div>
    )
  }

  if (currentStatus === "DRAFT" || currentStatus === "PENDING_APPROVAL") {
    return (
      <div className="py-4">
        <Button disabled className="h-14 w-full rounded-xl text-lg font-semibold opacity-50">
          Awaiting Approval
        </Button>
      </div>
    )
  }

  const buttonConfig: Record<string, { label: string; color: string }> = {
    APPROVED: { label: "Accept & Schedule", color: "bg-blue-600 hover:bg-blue-700 text-white" },
    SCHEDULED: { label: "Check In & Start", color: "bg-green-600 hover:bg-green-700 text-white" },
    IN_PROGRESS: { label: "Complete Job", color: "bg-[#ea580c] hover:bg-[#c2410c] text-white" },
  }

  const config = buttonConfig[currentStatus]
  if (!config) return null

  return (
    <div className="py-4">
      {!showNotes ? (
        <button
          type="button"
          className="mb-3 text-sm text-[#ea580c] hover:underline"
          onClick={() => setShowNotes(true)}
        >
          Add note
        </button>
      ) : (
        <Textarea
          className="mb-3 min-h-[80px] text-base"
          placeholder="Add a note..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      )}
      <Button
        onClick={handleStatusAction}
        disabled={loading}
        className={`h-14 w-full rounded-xl text-lg font-semibold ${config.color}`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          config.label
        )}
      </Button>
    </div>
  )
}
