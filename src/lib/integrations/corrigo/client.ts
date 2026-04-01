import { prisma } from "@/lib/prisma";

interface CorrigoWorkOrder {
  Id: number;
  Number?: string;
  StatusId?: number;
  Description?: string;
  PriorityId?: number;
  NteTotal?: number;
  DtScheduled?: string;
  DtDue?: string;
  Space?: {
    Name?: string;
    Address?: { City?: string; State?: string };
  };
  CustomFields?: Array<{ Name: string; Value: string }>;
}

interface CorrigoInvoice {
  WorkOrderId: number;
  InvoiceNumber: string;
  Amount: number;
  LaborCost?: number;
  MaterialCost?: number;
  Description?: string;
}

interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class CorrigoClient {
  private configId: string;
  private apiUrl: string;
  private companyId: string;
  private clientIdOAuth: string;
  private clientSecret: string;
  private cachedToken: TokenInfo | null = null;

  constructor(private config: {
    id: string;
    apiUrl: string;
    companyId: string;
    clientIdOAuth: string;
    clientSecret: string;
    accessToken?: string | null;
    tokenExpiresAt?: Date | null;
  }) {
    this.configId = config.id;
    this.apiUrl = config.apiUrl;
    this.companyId = config.companyId;
    this.clientIdOAuth = config.clientIdOAuth;
    this.clientSecret = config.clientSecret;

    if (config.accessToken && config.tokenExpiresAt) {
      this.cachedToken = {
        accessToken: config.accessToken,
        expiresAt: new Date(config.tokenExpiresAt),
      };
    }
  }

  static async fromClientId(clientId: string): Promise<CorrigoClient> {
    const config = await prisma.corrigoConfig.findUnique({
      where: { clientId },
    });
    if (!config) {
      throw new Error(`No Corrigo configuration found for client ${clientId}`);
    }
    if (!config.isActive) {
      throw new Error(`Corrigo integration is disabled for client ${clientId}`);
    }
    return new CorrigoClient(config);
  }

  private async getAccessToken(): Promise<string> {
    // Check cached token (with 5 minute buffer)
    if (this.cachedToken) {
      const bufferMs = 5 * 60 * 1000;
      if (this.cachedToken.expiresAt.getTime() - bufferMs > Date.now()) {
        return this.cachedToken.accessToken;
      }
    }

    // Request new token
    const tokenUrl = `${this.apiUrl}/token`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientIdOAuth,
      client_secret: this.clientSecret,
      company_id: this.companyId,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Corrigo OAuth token request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt,
    };

    // Persist token to DB
    await prisma.corrigoConfig.update({
      where: { id: this.configId },
      data: {
        accessToken: data.access_token,
        tokenExpiresAt: expiresAt,
      },
    });

    return data.access_token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retryCount = 0,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.apiUrl}/${path}`;

    const logEntry = await prisma.webhookLog.create({
      data: {
        source: "corrigo",
        direction: "outbound",
        event: `${method} ${path}`,
        payload: { method, url, body: body || null } as Record<string, unknown>,
        status: "sending",
      },
    });

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          CompanyId: this.companyId,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        // Handle token expiry - clear cache and retry
        if (response.status === 401 && retryCount === 0) {
          this.cachedToken = null;
          await prisma.webhookLog.update({
            where: { id: logEntry.id },
            data: { status: "retrying", errorMsg: "Token expired, refreshing" },
          });
          return this.request<T>(method, path, body, retryCount + 1);
        }

        const errorMsg = `Corrigo API error: ${response.status} ${JSON.stringify(responseData)}`;
        await prisma.webhookLog.update({
          where: { id: logEntry.id },
          data: { status: "failed", errorMsg },
        });

        // Retry with exponential backoff for server errors
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request<T>(method, path, body, retryCount + 1);
        }

        throw new Error(errorMsg);
      }

      await prisma.webhookLog.update({
        where: { id: logEntry.id },
        data: {
          status: "success",
          payload: {
            method,
            url,
            body: body || null,
            response: responseData,
          } as Record<string, unknown>,
        },
      });

      return responseData as T;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Corrigo API error:")) {
        throw error;
      }

      // Network errors - retry with backoff
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        await prisma.webhookLog.update({
          where: { id: logEntry.id },
          data: { status: "retrying", errorMsg: `Network error, retry ${retryCount + 1}` },
        });
        return this.request<T>(method, path, body, retryCount + 1);
      }

      const errorMsg = error instanceof Error ? error.message : "Unknown network error";
      await prisma.webhookLog.update({
        where: { id: logEntry.id },
        data: { status: "failed", errorMsg },
      });
      throw error;
    }
  }

  async getWorkOrder(workOrderId: number): Promise<CorrigoWorkOrder> {
    return this.request<CorrigoWorkOrder>(
      "GET",
      `commands/GetEntity?entityName=WorkOrder&entityId=${workOrderId}`
    );
  }

  async updateWorkOrderStatus(
    workOrderId: number,
    statusId: number,
    comment?: string
  ): Promise<void> {
    await this.request("POST", "commands/UpdateEntity", {
      Entity: {
        "@type": "WorkOrder",
        Id: workOrderId,
        StatusId: statusId,
      },
      Comment: comment || undefined,
    });
  }

  async acknowledgeWorkOrder(workOrderId: number): Promise<void> {
    await this.request("POST", "commands/AcknowledgeWorkOrder", {
      WorkOrderId: workOrderId,
    });
  }

  async submitInvoice(invoice: CorrigoInvoice): Promise<{ InvoiceId: number }> {
    return this.request<{ InvoiceId: number }>("POST", "commands/CreateEntity", {
      Entity: {
        "@type": "Invoice",
        WorkOrderId: invoice.WorkOrderId,
        Number: invoice.InvoiceNumber,
        Amount: invoice.Amount,
        LaborCost: invoice.LaborCost || 0,
        MaterialCost: invoice.MaterialCost || 0,
        Description: invoice.Description || "",
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}
