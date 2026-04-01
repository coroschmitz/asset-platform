import { prisma } from "@/lib/prisma"

interface ApprovalRule {
  id: string
  triggerField: string
  triggerOperator: string
  triggerValue: string
  approverUserId: string
  sortOrder: number
}

/**
 * Evaluate which approval rules match a work order
 */
export async function evaluateApprovalRules(workOrder: {
  clientId: string
  totalCost: number | null
  priority: string
  requestType: string
}): Promise<ApprovalRule[]> {
  const rules = await prisma.approvalRule.findMany({
    where: { clientId: workOrder.clientId, isActive: true },
    orderBy: { sortOrder: "asc" },
  })

  return rules.filter((rule) => {
    const fieldValue = getFieldValue(workOrder, rule.triggerField)
    return matchesCondition(fieldValue, rule.triggerOperator, rule.triggerValue)
  })
}

function getFieldValue(workOrder: any, field: string): any {
  switch (field) {
    case "totalCost": return workOrder.totalCost ?? 0
    case "priority": return workOrder.priority
    case "requestType": return workOrder.requestType
    default: return null
  }
}

function matchesCondition(value: any, operator: string, target: string): boolean {
  switch (operator) {
    case "gt": return Number(value) > Number(target)
    case "gte": return Number(value) >= Number(target)
    case "lt": return Number(value) < Number(target)
    case "eq": return String(value) === target
    case "in": return target.split(",").map(s => s.trim()).includes(String(value))
    default: return false
  }
}

/**
 * Create approval steps for a work order based on matching rules.
 * Called when a work order moves to PENDING_APPROVAL.
 */
export async function createApprovalSteps(workOrderId: string): Promise<void> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { clientId: true, totalCost: true, priority: true, requestType: true },
  })
  if (!workOrder) return

  const matchingRules = await evaluateApprovalRules(workOrder)

  if (matchingRules.length === 0) {
    // No rules match - auto-approve
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: "APPROVED" },
    })
    await prisma.activityLog.create({
      data: {
        workOrderId,
        type: "STATUS_CHANGE",
        title: "Auto-approved",
        text: "No approval rules matched. Work order auto-approved.",
      },
    })
    return
  }

  for (const rule of matchingRules) {
    await prisma.approvalStep.create({
      data: {
        workOrderId,
        ruleId: rule.id,
        approverUserId: rule.approverUserId,
        status: "pending",
      },
    })
  }
}

/**
 * Process an approval decision on a step.
 */
export async function processApproval(
  stepId: string,
  decision: "approved" | "rejected",
  notes?: string
): Promise<{ workOrderId: string; newStatus: string }> {
  const step = await prisma.approvalStep.update({
    where: { id: stepId },
    data: {
      status: decision,
      notes,
      decidedAt: new Date(),
    },
    include: { workOrder: true, approver: { select: { name: true } } },
  })

  const allSteps = await prisma.approvalStep.findMany({
    where: { workOrderId: step.workOrderId },
  })

  let newStatus: string

  if (decision === "rejected") {
    // Any rejection rejects the entire work order
    newStatus = "DRAFT"
    await prisma.workOrder.update({
      where: { id: step.workOrderId },
      data: { status: "DRAFT" },
    })
    await prisma.activityLog.create({
      data: {
        workOrderId: step.workOrderId,
        userId: step.approverUserId,
        type: "STATUS_CHANGE",
        title: "Approval rejected",
        text: `${step.approver.name} rejected: ${notes || "No reason given"}`,
      },
    })
  } else {
    // Check if all steps are approved
    const allApproved = allSteps.every((s) => s.id === stepId ? true : s.status === "approved")
    if (allApproved) {
      newStatus = "APPROVED"
      await prisma.workOrder.update({
        where: { id: step.workOrderId },
        data: { status: "APPROVED" },
      })
      await prisma.activityLog.create({
        data: {
          workOrderId: step.workOrderId,
          userId: step.approverUserId,
          type: "STATUS_CHANGE",
          title: "All approvals received",
          text: `Work order approved by all required approvers`,
        },
      })
    } else {
      newStatus = "PENDING_APPROVAL"
      await prisma.activityLog.create({
        data: {
          workOrderId: step.workOrderId,
          userId: step.approverUserId,
          type: "ACTIVITY",
          title: "Approval step completed",
          text: `${step.approver.name} approved${notes ? `: ${notes}` : ""}`,
        },
      })
    }
  }

  return { workOrderId: step.workOrderId, newStatus }
}
