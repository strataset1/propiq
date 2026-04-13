-- supabase/migrations/20260413000007_owner_email.sql
alter table organisations add column owner_email text unique;
