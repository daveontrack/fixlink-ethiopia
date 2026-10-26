-- ============================================================================
-- DROP ALL TABLES WITH CASCADE (handles dependent objects like functions)
-- Run this ONCE, then run all 29 migrations below
-- ============================================================================

-- Drop in reverse dependency order with CASCADE
drop table if exists public.push_outbox cascade;
drop table if exists public.device_tokens cascade;
drop table if exists public.notifications cascade;
drop table if exists public.job_status_events cascade;
drop table if exists public.job_photos cascade;
drop table if exists public.job_requests cascade;
drop table if exists public.job_transition_rules cascade;

-- Professional system tables
drop table if exists public.professional_services cascade;
drop table if exists public.service_areas cascade;
drop table if exists public.verification_documents cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.professionals cascade;

-- Core tables
drop table if exists public.profiles cascade;
drop table if exists public.service_categories cascade;

-- Drop enum types (they'll be recreated by migrations)
drop type if exists public.job_status cascade;
drop type if exists public.job_priority cascade;
drop type if exists public.verification_status cascade;
drop type if exists public.user_role cascade;
drop type if exists public.account_status cascade;
drop type if exists public.language_code cascade;
drop type if exists public.device_platform cascade;

-- ============================================================================
-- STEP 2: RUN ALL 29 MIGRATIONS (in numerical order)
-- Each migration uses "create table if not exists" and "on conflict do nothing"
-- so re-running is completely safe and idempotent
-- ============================================================================

-- == Migration 1: Extensions and enums ==
-- This creates the enum types used by later migrations
-- == Paste content of 20261020000000_extensions_and_enums.sql here ==

-- == Migration 2: Profiles, identity, auth helpers, RLS ==
-- == Paste content of 20261020000100_profiles_and_identity.sql here ==

-- == Migration 3: Service categories ==
-- == Paste content of 20261020000200_service_categories.sql here ==

-- == Migration 4: Sub-cities ==
-- == Paste content of 20261020000250_sub_cities.sql here ==

-- == Migration 5: Professionals, services, service areas ==
-- == Paste content of 20261020000300_professionals.sql here ==

-- == Migration 6: Audit log and verification documents ==
-- == Paste content of 20261020000400_audit_log_and_verification_documents.sql here ==

-- == Migration 7: Notifications, device tokens, push outbox ==
-- == Paste content of 20261020000500_notifications_and_push.sql here ==

-- == Migration 8: Job requests, photos, status events ==
-- == Paste content of 20261020000600_job_requests.sql here ==

-- == Migration 9: Quotations and bookings ==
-- == Paste content of 20261020000700_quotations_and_bookings.sql here ==

-- == Migration 10: Matching ==
-- == Paste content of 20261020000800_matching.sql here ==

-- == Migration 11: Messages ==
-- == Paste content of 20261020000900_messages.sql here ==

-- == Migration 12: Reviews, reports, admin ==
-- == Paste content of 20261020001000_reviews_reports_admin.sql here ==

-- == Migration 13: Realtime grants idempotency ==
-- == Paste content of 20261020001100_realtime_grants_idempotency.sql here ==

-- == Migration 14: Storage and participant policies ==
-- == Paste content of 20261020001200_storage_and_participant_policies.sql here ==

-- == Migration 15: Lock down privileges ==
-- == Paste content of 20261020001300_lock_down_privileges.sql here ==

-- == Migration 16: Message views ==
-- == Paste content of 20261020001400_message_views.sql here ==

-- == Migration 17: Privilege tightening and insert guards ==
-- == Paste content of 20261020001500_privilege_tightening_and_insert_guards.sql here ==

-- == Migration 18: Professional locations view ==
-- == Paste content of 20261020001600_professional_locations_view.sql here ==

-- == Migration 19: Admin professional availability ==
-- == Paste content of 20261020001700_admin_professional_availability.sql here ==

-- == Migration 20: Fix response rate trigger ==
-- == Paste content of 20261020001800_fix_response_rate_trigger.sql here ==

-- == Migration 21: Notification emailed at ==
-- == Paste content of 20261020001900_notification_emailed_at.sql here ==

-- == Migration 22: Fix RLS recursion ==
-- == Paste content of 20261020002000_fix_rls_recursion.sql here ==

-- == Migration 23: Matching queue functions ==
-- == Paste content of 20261020002100_matching_queue_functions.sql here ==

-- == Migration 24: Push outbox functions ==
-- == Paste content of 20261020002200_push_outbox_functions.sql here ==

-- == Migration 25: Sub-city columns and functions ==
-- == Paste content of 20261020002400_sub_city_columns_and_functions.sql here ==

-- == Migration 26: Clerk identity (first portion) ==
-- == Paste content of 20261020002500_clerk_identity.sql here ==

-- == Migration 27: Contact messages ==
-- == Paste content of 20261022000000_contact_messages.sql here ==

-- == Migration 28: Clerk identity (second portion) ==
-- == Paste content of 20261022000100_clerk_identity.sql here ==

-- == Migration 29: Sub-city verified kebeles ==
-- == Paste content of 20261023000100_sub_city_verified_kebeles.sql here ==

-- ============================================================================
-- VERIFICATION: Check all tables are created
-- ============================================================================
SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;