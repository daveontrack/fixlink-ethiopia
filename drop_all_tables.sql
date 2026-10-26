-- ============================================================================
-- DROP ALL TABLES IN PUBLIC SCHEMA (with CASCADE for dependencies)
-- Run this ONCE to completely clear the database
-- ============================================================================

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(t.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Also drop any remaining enum types that might exist
-- Using typnamespace instead of typschema (PostgreSQL 16+ compatibility)
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT typname, typnamespace FROM pg_type WHERE typnamespace = 2200 AND typtype = 'E'
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(t.typname) || ' CASCADE';
  END LOOP;
END $$;

-- Verify: show remaining tables
SELECT 'Remaining tables:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;