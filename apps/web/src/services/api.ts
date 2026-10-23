import type { ApiResult } from "@/types";

/**
 * Thin fetch wrapper for the app's own route handlers.
 * Used by client components that talk to `/api/*`.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiResult<T>> {
  const { json, ...rest } = init ?? {};

  try {
    const response = await fetch(path, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(rest.headers ?? {}),
      },
      body: json === undefined ? rest.body : JSON.stringify(json),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.error ?? `Request failed with ${response.status}`,
        code: payload?.code,
        fieldErrors: payload?.fieldErrors,
      };
    }

    return payload as ApiResult<T>;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
