-- Enable RLS on all tables.
-- All app queries use the service role key which bypasses RLS, so no policies needed.
-- This prevents any anon/public access to the database.

alter table properties enable row level security;
alter table documents enable row level security;
alter table strata_bylaws enable row level security;
alter table organisations enable row level security;
alter table api_keys enable row level security;
alter table api_usage enable row level security;
alter table processing_batches enable row level security;
alter table property_summaries enable row level security;
alter table suburb_crawls enable row level security;
