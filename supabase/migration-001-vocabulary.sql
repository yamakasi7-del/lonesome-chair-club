-- Run this in Supabase (SQL Editor) if schema.sql was already applied.
-- Adds the per-session vocabulary shown on /clubs/[clubId].

alter table clubs add column if not exists vocabulary text;
