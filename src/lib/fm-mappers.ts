/* eslint-disable @typescript-eslint/no-explicit-any */

function mapCorrigoPriority(priorityId: number): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  switch (priorityId) {
    case 1: return "URGENT";
    case 2: return "HIGH";
    case 3: return "MEDIUM";
    case 4: return "LOW";
    case 5: return "LOW";
    default: return "MEDIUM";
  }
}

function mapServiceNowPriority(priority: number): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  switch (priority) {
    case 1: return "URGENT";
    case 2: return "HIGH";
    case 3: return "MEDIUM";
    case 4: return "LOW";
    default: return "MEDIUM";
  }
}

function mapCbrePriority(priority: string): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  switch (priority?.toLowerCase()) {
    case "critical": return "URGENT";
    case "high": return "HIGH";
    case "normal": return "MEDIUM";
    case "low": return "LOW";
    default: return "MEDIUM";
  }
}

function mapCushmanPriority(urgency: string): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  switch (urgency?.toLowerCase()) {
    case "emergency": return "URGENT";
    case "urgent": return "HIGH";
    case "standard": return "MEDIUM";
    case "low": return "LOW";
    default: return "MEDIUM";
  }
}

export function corrigoMapper(payload: any) {
  const wo = payload.WorkOrder || payload;
  const customFields = wo.CustomFields || [];
  const poField = customFields.find((f: any) => f.Name === "PO" || f.Name === "PONumber" || f.Name === "PurchaseOrder");
  const ccField = customFields.find((f: any) => f.Name === "CostCenter" || f.Name === "Cost Center");

  return {
    externalId: String(wo.Id),
    externalSource: "corrigo" as const,
    orderNumber: `CRG-${wo.Number || wo.Id}`,
    description: wo.Description || "",
    priority: mapCorrigoPriority(wo.PriorityId || 3),
    scheduledDate: wo.DtScheduled ? new Date(wo.DtScheduled) : undefined,
    slaCompletionDue: wo.DtDue ? new Date(wo.DtDue) : undefined,
    nteAmount: wo.NteTotal ? Number(wo.NteTotal) : undefined,
    fromDetail: wo.Space?.Name || undefined,
    poNumber: poField?.Value || undefined,
    costCenter: ccField?.Value || undefined,
    _locationHints: {
      city: wo.Space?.Address?.City,
      state: wo.Space?.Address?.State,
    },
  };
}

export function servicenowMapper(payload: any) {
  const result = payload.result || payload;
  return {
    externalId: result.sys_id || result.number,
    externalSource: "servicenow" as const,
    orderNumber: `SNOW-${result.number}`,
    jobName: result.short_description || "",
    description: result.description || "",
    priority: mapServiceNowPriority(Number(result.priority) || 3),
    fromDetail: result.location?.display_value || undefined,
    poNumber: result.u_po_number || undefined,
    costCenter: result.u_cost_center || undefined,
    _locationHints: {
      name: result.location?.display_value,
    },
  };
}

export function cbreNexusMapper(payload: any) {
  return {
    externalId: String(payload.workOrderId),
    externalSource: "cbre" as const,
    orderNumber: `CBRE-${payload.workOrderId}`,
    description: payload.description || "",
    priority: mapCbrePriority(payload.priority || "Normal"),
    fromDetail: payload.siteName || undefined,
    glCode: payload.costCode || undefined,
    nteAmount: payload.nteAmount ? Number(payload.nteAmount) : undefined,
    _locationHints: {
      code: payload.siteId,
      name: payload.siteName,
    },
  };
}

export function cushmanMapper(payload: any) {
  return {
    externalId: String(payload.requestId),
    externalSource: "cushman" as const,
    orderNumber: `CW-${payload.requestId}`,
    jobName: payload.summary || "",
    description: payload.details || "",
    priority: mapCushmanPriority(payload.urgency || "Standard"),
    fromDetail: payload.buildingName || undefined,
    poNumber: payload.billingReference || undefined,
    nteAmount: payload.nteLimit ? Number(payload.nteLimit) : undefined,
    _locationHints: {
      code: payload.buildingCode,
      name: payload.buildingName,
    },
  };
}
