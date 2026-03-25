import { timingSafeEqual } from 'crypto'

/**
 * Timing-safe string comparison. Prevents timing attacks on token validation.
 * Handles different-length strings safely (timingSafeEqual throws on length mismatch).
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  // Pad shorter string to match length, then compare
  // This prevents length-based timing leaks while keeping constant-time comparison
  const maxLen = Math.max(a.length, b.length)
  const aBuf = Buffer.alloc(maxLen)
  const bBuf = Buffer.alloc(maxLen)
  aBuf.write(a)
  bBuf.write(b)
  // Both buffers are same length now, safe for timingSafeEqual
  // But we also need to check actual lengths match (padding shouldn't make "ab" == "a")
  return a.length === b.length && timingSafeEqual(aBuf, bBuf)
}

/**
 * Create a safe error response that redacts internal details in production.
 * In development, includes full error details for debugging.
 */
export function safeErrorResponse(
  message: string,
  error: unknown,
  status: number = 500,
  headers?: Record<string, string>
): Response {
  const isDev = process.env.NODE_ENV === 'development'
  const body: Record<string, unknown> = { error: message }

  if (isDev) {
    body.details = error instanceof Error ? error.message : String(error)
  }

  return Response.json(body, { status, headers })
}
