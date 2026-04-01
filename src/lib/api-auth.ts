export function validateApiKey(request: Request): { valid: boolean; error?: string } {
  const envKey = process.env.COROVAN_API_KEY
  if (!envKey) return { valid: true } // dev mode — no key required

  const header = request.headers.get("x-api-key")
  if (!header) return { valid: false, error: "Missing x-api-key header" }
  if (header !== envKey) return { valid: false, error: "Invalid API key" }

  return { valid: true }
}
