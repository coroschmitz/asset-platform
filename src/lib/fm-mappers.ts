// FM platform webhook payload mappers
// Each returns a partial WorkOrder-create-compatible object

const CORRIGO_PRIORITY: Record<number, string> = { 1: "URGENT", 2: "HIGH", 3: "HIGH", 4: "MEDIUM", 5: "LOW" }
const SNOW_PRIORITY: Record<number, string> = { 1: "URGENT", 2: "HIGH", 3: "MEDIUM", 4: "LOW" }
const CBRE_PRIORITY: Record<string, string> = { Critical: "URGENT", High: "HIGH", Normal: "MEDIUM", Low: "LOW" }
const CUSHMAN_PRIORITY: Record<string, string> = { Emergency: "URGENT", Urgent: "HIGH", Standard: "MEDIUM", Low: "LOW" }

export function corrigoMapper(payload: Record<string, unknown>) {
  const wo = payload.WorkOrder as Record<string, unknown> | undefined
  if (!wo) throw new Error("Missing WorkOrder object in Corrigo payload")

  const num = wo.Number as string | undefined
  if (!num) throw new Error("Missing WorkOrder.Number in Corrigo payload")

  const space = wo.Space as Record<string, unknown> | undefined
  const customFields = wo.CustomFields as Record<string, unknown> | undefined

  return {
    orderNumber: `CRG-${num}`,
    description: (wo.Description as string) || undefined,
    priority: CORRIGO_PRIORITY[(wo.PriorityId as number) ?? 4] || "MEDIUM",
    fromDetail: (space?.Address as string) || undefined,
    locationCity: (space?.City as string) || undefined,
    locationState: (space?.State as string) || undefined,
    poNumber: (customFields?.PurchaseOrder as string) || undefined,
    costCenter: (customFields?.CostCenter as string) || undefined,
    requestType: "FM_WORK_ORDER",
    externalSource: "corrigo",
  }
}

export function servicenowMapper(payload: Record<string, unknown>) {
  const num = payload.number as string | undefined
  if (!num) throw new Error("Missing number in ServiceNow payload")

  const location = payload.location as Record<string, unknown> | undefined
  const variables = payload.variables as Record<string, unknown> | undefined

  return {
    orderNumber: `SNOW-${num}`,
    jobName: (payload.short_description as string) || undefined,
    description: (payload.description as string) || undefined,
    priority: SNOW_PRIORITY[(payload.priority as number) ?? 3] || "MEDIUM",
    fromDetail: (location?.name as string) || undefined,
    locationCity: (location?.city as string) || undefined,
    locationState: (location?.state as string) || undefined,
    poNumber: (variables?.po_number as string) || undefined,
    costCenter: (variables?.cost_center as string) || undefined,
    requestType: "FM_WORK_ORDER",
    externalSource: "servicenow",
  }
}

export function cbreNexusMapper(payload: Record<string, unknown>) {
  const woId = payload.workOrderId as string | undefined
  if (!woId) throw new Error("Missing workOrderId in CBRE Nexus payload")

  return {
    orderNumber: `CBRE-${woId}`,
    description: (payload.description as string) || undefined,
    priority: CBRE_PRIORITY[(payload.priority as string) ?? "Normal"] || "MEDIUM",
    locationCode: (payload.siteId as string) || undefined,
    fromDetail: (payload.siteName as string) || undefined,
    glCode: (payload.costCode as string) || undefined,
    requestType: "FM_WORK_ORDER",
    externalSource: "cbre",
  }
}

export function cushmanMapper(payload: Record<string, unknown>) {
  const reqId = payload.requestId as string | undefined
  if (!reqId) throw new Error("Missing requestId in Cushman payload")

  return {
    orderNumber: `CW-${reqId}`,
    jobName: (payload.summary as string) || undefined,
    description: (payload.details as string) || undefined,
    priority: CUSHMAN_PRIORITY[(payload.urgency as string) ?? "Standard"] || "MEDIUM",
    locationCode: (payload.buildingCode as string) || undefined,
    fromDetail: (payload.buildingName as string) || undefined,
    poNumber: (payload.billingReference as string) || undefined,
    requestType: "FM_WORK_ORDER",
    externalSource: "cushman",
  }
}
