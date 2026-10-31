import type { ActionResult } from "../types";

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
}

export function succeed<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, ...(message ? { message } : {}), ...(data !== undefined ? { data } : {}) };
}

export const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
export const NOT_ALLOWED = "You don't have permission to do that.";

/** Postgres unique-violation. */
export const isUniqueViolation = (error: { code?: string } | null | undefined) => error?.code === "23505";

/** Never show raw database errors to users; log them for the operator. */
export function dbFail(context: string, error: { message: string }): ActionResult<never> {
  console.error(`[${context}]`, error.message);
  return fail("Something went wrong while saving. Please try again.");
}
