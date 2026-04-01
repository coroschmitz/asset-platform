"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function CompletionPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const pid = searchParams.get("pid") ?? ""
  const workOrderId = params.id

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [nteAmount, setNteAmount] = useState<number | null>(null)

  const [completionComments, setCompletionComments] = useState("")
  const [hoursWorked, setHoursWorked] = useState("")
  const [materialCost, setMaterialCost] = useState("")
  const [issues, setIssues] = useState("")
  const [gpsLat, setGpsLat] = useState<number | null>(null)
  const [gpsLng, setGpsLng] = useState<number | null>(null)

  useEffect(() => {
    // Fetch order info for NTE and order number
    fetch(`/api/v1/work-orders/${workOrderId}`)
      .then((r) => {
        if (r.ok) return r.json()
        return null
      })
      .then((data) => {
        if (data) {
          setOrderNumber(data.orderNumber || "")
          setNteAmount(data.nteAmount ?? null)
        }
      })
      .catch(() => {})

    // Capture GPS
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLat(pos.coords.latitude)
          setGpsLng(pos.coords.longitude)
        },
        () => {},
        { timeout: 10000 }
      )
    } catch {
      // GPS not available
    }
  }, [workOrderId])

  const estimatedTotal = (parseFloat(hoursWorked || "0") * 85) + parseFloat(materialCost || "0")
  const nteExceeded = nteAmount != null && estimatedTotal > nteAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/work-orders/${workOrderId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completionComments: completionComments + (issues ? `\n\nIssues: ${issues}` : ""),
          hoursWorked,
          materialCost: materialCost || undefined,
          gpsLat,
          gpsLng,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrderNumber(data.orderNumber || orderNumber)
        setSubmitted(true)
      }
    } catch (error) {
      console.error("Checkout failed:", error)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold">Job #{orderNumber} Complete!</h1>
        <Link
          href={`/partner/orders?pid=${pid}`}
          className="mt-2 inline-block rounded-xl bg-[#ea580c] px-6 py-3 text-base font-semibold text-white hover:bg-[#c2410c]"
        >
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/partner/orders/${workOrderId}?pid=${pid}`}
        className="mb-3 inline-block text-sm text-[#ea580c] hover:underline"
      >
        ← Back to Order
      </Link>
      <h1 className="mb-4 text-xl font-bold">Complete Job</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Photo upload */}
        <div>
          <label className="mb-1 block text-sm font-medium">Photos</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="block w-full text-base file:mr-3 file:rounded-lg file:border-0 file:bg-[#ea580c] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </div>

        {/* Completion comments */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Completion Comments <span className="text-red-500">*</span>
          </label>
          <Textarea
            required
            className="min-h-[100px] text-base"
            placeholder="Describe the work completed..."
            value={completionComments}
            onChange={(e) => setCompletionComments(e.target.value)}
          />
        </div>

        {/* Hours worked */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Hours Worked <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.5"
            min="0"
            required
            className="h-12 text-base"
            placeholder="0.0"
            value={hoursWorked}
            onChange={(e) => setHoursWorked(e.target.value)}
          />
        </div>

        {/* Material costs */}
        <div>
          <label className="mb-1 block text-sm font-medium">Material Costs ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="h-12 text-base"
            placeholder="0.00"
            value={materialCost}
            onChange={(e) => setMaterialCost(e.target.value)}
          />
        </div>

        {/* NTE Warning */}
        {nteExceeded && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-amber-800">
                ⚠ Estimated total (${estimatedTotal.toFixed(2)}) exceeds NTE of $
                {nteAmount!.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Issues */}
        <div>
          <label className="mb-1 block text-sm font-medium">Issues Encountered</label>
          <Textarea
            className="min-h-[80px] text-base"
            placeholder="Any issues or exceptions..."
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-14 w-full rounded-xl bg-[#ea580c] text-lg font-semibold text-white hover:bg-[#c2410c]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit Completion"
          )}
        </Button>
      </form>
    </div>
  )
}
