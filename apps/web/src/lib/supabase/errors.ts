/**
 * PostgREST raises these codes when the deployed database does not have the
 * column a query or payload refers to:
 *
 *   42703   undefined_column (the SQL statement itself failed)
 *   PGRST204  the column is missing from the PostgREST schema cache
 *
 * A deployment can legitimately be older than the migrations in `supabase/`
 * (for example one created after the switch to Clerk never had the legacy
 * `auth_user_id` column), so callers use this to fall back instead of failing
 * the whole request.
 */
export function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  column?: string,
): boolean {
  if (!error) return false;
  if (error.code !== "42703" && error.code !== "PGRST204") return false;
  if (!column) return true;

  return (error.message ?? "").includes(column);
}
