import { NextRequest } from "next/server";

export function validateApiKey(request: NextRequest): { valid: boolean; error?: string } {
  const envKey = process.env.COROVAN_API_KEY;
  if (!envKey) {
    return { valid: true };
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return { valid: false, error: "Missing x-api-key header" };
  }

  if (apiKey !== envKey) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}
