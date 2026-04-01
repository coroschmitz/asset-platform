function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return result;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function calculateSLADates(
  priority: string,
  createdAt: Date
): { slaResponseDue: Date; slaCompletionDue: Date } {
  switch (priority) {
    case "URGENT":
      return {
        slaResponseDue: addHours(createdAt, 1),
        slaCompletionDue: addHours(createdAt, 24),
      };
    case "HIGH":
      return {
        slaResponseDue: addHours(createdAt, 2),
        slaCompletionDue: addBusinessDays(createdAt, 3),
      };
    case "MEDIUM":
      return {
        slaResponseDue: addHours(createdAt, 4),
        slaCompletionDue: addBusinessDays(createdAt, 5),
      };
    case "LOW":
    default:
      return {
        slaResponseDue: addHours(createdAt, 8),
        slaCompletionDue: addBusinessDays(createdAt, 10),
      };
  }
}

export function checkSLAStatus(wo: {
  slaResponseDue?: Date | null;
  slaCompletionDue?: Date | null;
  respondedAt?: Date | null;
  completedDate?: Date | null;
}): {
  responseStatus: "met" | "at_risk" | "breached";
  completionStatus: "met" | "at_risk" | "breached";
} {
  const now = new Date();

  let responseStatus: "met" | "at_risk" | "breached" = "met";
  if (wo.slaResponseDue) {
    const due = new Date(wo.slaResponseDue);
    if (wo.respondedAt) {
      responseStatus = new Date(wo.respondedAt) <= due ? "met" : "breached";
    } else if (now > due) {
      responseStatus = "breached";
    } else {
      const timeLeft = due.getTime() - now.getTime();
      const totalTime = due.getTime() - (due.getTime() - 4 * 60 * 60 * 1000);
      responseStatus = timeLeft < totalTime * 0.25 ? "at_risk" : "met";
    }
  }

  let completionStatus: "met" | "at_risk" | "breached" = "met";
  if (wo.slaCompletionDue) {
    const due = new Date(wo.slaCompletionDue);
    if (wo.completedDate) {
      completionStatus = new Date(wo.completedDate) <= due ? "met" : "breached";
    } else if (now > due) {
      completionStatus = "breached";
    } else {
      const timeLeft = due.getTime() - now.getTime();
      const totalWindow = 24 * 60 * 60 * 1000;
      completionStatus = timeLeft < totalWindow ? "at_risk" : "met";
    }
  }

  return { responseStatus, completionStatus };
}
