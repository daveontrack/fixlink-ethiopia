import "server-only";

// Restore removed (phantom) table entries so the frontend compiles.
// These tables do not exist in the live Supabase DB; the frontend
// services that reference them are best-effort and cast loosely.
export {};