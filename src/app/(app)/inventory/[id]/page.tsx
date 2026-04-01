"use client"

import { use } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { ArrowLeft, Package, MapPin, DollarSign, Clock, Camera, Wrench, Recycle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

const CONDITION_COLORS: Record<string, string> = {
  EXCELLENT: "bg-emerald-100 text-emerald-700",
  GOOD: "bg-blue-100 text-blue-700",
  FAIR: "bg-yellow-100 text-yellow-700",
  POOR: "bg-orange-100 text-orange-700",
  DAMAGED: "bg-red-100 text-red-700",
}

const STATUS_COLORS: Record<string, string> = {
  IN_STORAGE: "bg-gray-100 text-gray-700",
  DEPLOYED: "bg-green-100 text-green-700",
  AVAILABLE: "bg-blue-100 text-blue-700",
  RESERVED: "bg-purple-100 text-purple-700",
  IN_TRANSIT: "bg-orange-100 text-orange-700",
  DECOMMISSIONED: "bg-red-100 text-red-700",
}

const WO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: asset, isLoading } = trpc.assets.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (!asset) {
    return <div className="text-center py-12 text-muted-foreground">Asset not found</div>
  }

  const dims = [asset.width, asset.height, asset.depth].filter(Boolean)
  const dimsStr = dims.length > 0 ? dims.join(" x ") + '"' : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inventory">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{asset.tagNumber}</h1>
            <Badge className={cn("text-xs", STATUS_COLORS[asset.status])}>
              {asset.status.replace(/_/g, " ")}
            </Badge>
            <Badge className={cn("text-xs", CONDITION_COLORS[asset.condition])}>
              {asset.condition}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{asset.description}</p>
        </div>
      </div>

      {/* Photo Gallery */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {asset.photos.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto">
              {asset.photos.map((photo) => (
                <div key={photo.id} className="h-32 w-32 rounded-lg border overflow-hidden shrink-0">
                  <img src={photo.url} alt={asset.tagNumber} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed text-muted-foreground text-sm">
              No photos available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <DetailRow label="Type" value={asset.type} />
              <DetailRow label="Category" value={asset.category} />
              <DetailRow label="Manufacturer" value={asset.manufacturer} />
              <DetailRow label="Dimensions (WxHxD)" value={dimsStr} />
              <DetailRow label="Primary Material" value={asset.primaryMaterial} />
              <DetailRow label="Primary Color" value={asset.primaryColor} />
              <DetailRow label="Serial Number" value={asset.serialNumber} />
              <DetailRow label="Model Number" value={asset.modelNumber} />
              <DetailRow label="Part Number" value={asset.partNumber} />
              <DetailRow label="Quantity" value={asset.quantity?.toString()} />
            </dl>
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <DetailRow label="Original Cost" value={asset.originalCost ? formatCurrency(asset.originalCost) : null} />
              <DetailRow label="Current Value" value={asset.currentValue ? formatCurrency(asset.currentValue) : null} />
              <DetailRow label="Monthly Storage" value={asset.monthlyStorageCost ? formatCurrency(asset.monthlyStorageCost) : null} />
              <DetailRow label="Est. Resale Value" value={asset.estimatedResaleValue ? formatCurrency(asset.estimatedResaleValue) : null} />
              <DetailRow label="Disposition Rec." value={asset.dispositionRec} />
              <DetailRow label="Cost Center" value={asset.costCenter} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Location */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <DetailRow label="Location" value={asset.location.name} />
              <DetailRow label="City, State" value={`${asset.location.city}, ${asset.location.state}`} />
              <DetailRow label="Partner" value={asset.location.partner?.name} />
            </dl>
            <Link href={`/locations/${asset.locationId}`} className="text-xs text-primary hover:underline mt-2 inline-block">
              View location details &rarr;
            </Link>
          </CardContent>
        </Card>

        {/* Lifecycle */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <DetailRow label="Date Received" value={asset.dateReceived ? format(new Date(asset.dateReceived), "MMM d, yyyy") : null} />
              <DetailRow label="Last Audit" value={asset.lastAuditDate ? format(new Date(asset.lastAuditDate), "MMM d, yyyy") : null} />
              <DetailRow label="Last Moved" value={asset.lastMovedDate ? format(new Date(asset.lastMovedDate), "MMM d, yyyy") : null} />
              <DetailRow label="Months Dormant" value={asset.monthsDormant?.toString()} />
              <DetailRow label="Total Storage Cost" value={asset.totalStorageCostIncurred ? formatCurrency(asset.totalStorageCostIncurred) : null} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Work Order History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Work Order History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {asset.workOrderItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No work orders for this asset</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Order #</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {asset.workOrderItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-2">
                      <Link href={`/orders/${item.workOrder.id}`} className="text-primary hover:underline">
                        {item.workOrder.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{item.workOrder.requestType}</td>
                    <td className="px-4 py-2 text-xs">
                      {format(new Date(item.workOrder.requestDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-2">
                      <Badge className={cn("text-[10px]", WO_STATUS_COLORS[item.workOrder.status])}>
                        {item.workOrder.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Disposition History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Recycle className="h-4 w-4" />
            Disposition History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {asset.dispositions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No disposition records</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Material</th>
                  <th className="px-4 py-2 text-right">Weight (lbs)</th>
                  <th className="px-4 py-2 text-right">CO2 Avoided (lbs)</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {asset.dispositions.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{d.method}</td>
                    <td className="px-4 py-2">{d.materialType || "—"}</td>
                    <td className="px-4 py-2 text-right">{d.weightLbs?.toFixed(1) || "—"}</td>
                    <td className="px-4 py-2 text-right">{d.carbonAvoidedLbs?.toFixed(1) || "—"}</td>
                    <td className="px-4 py-2 text-xs">
                      {d.completedAt ? format(new Date(d.completedAt), "MMM d, yyyy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </>
  )
}
