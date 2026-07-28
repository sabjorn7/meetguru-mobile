/**
 * Extract a human-readable message from an unknown thrown value.
 * Supabase/PostgREST errors are plain objects ({ message, details, hint, code }),
 * not Error instances, so `instanceof Error` alone loses their message.
 */
export function errorMessage(e: unknown, fallback = 'Что-то пошло не так.'): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e) return e;
  if (e && typeof e === 'object') {
    const obj = e as { message?: unknown; error_description?: unknown };
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.error_description === 'string' && obj.error_description) {
      return obj.error_description;
    }
  }
  return fallback;
}
