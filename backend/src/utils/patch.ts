import type { z } from 'zod'

// Zod 4 applies `.default()` values even inside `.partial()`, which would make
// a PATCH silently reset every field that has a default. Parse the body, then
// keep only the keys the client actually sent.
export function parsePatch<S extends z.ZodObject>(schema: S, body: unknown): Partial<z.infer<S>> {
  const sent = body && typeof body === 'object' ? Object.keys(body) : []
  const parsed = schema.partial().parse(body ?? {}) as Record<string, unknown>
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => sent.includes(k))) as Partial<z.infer<S>>
}
