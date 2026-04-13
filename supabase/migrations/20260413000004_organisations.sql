create type plan_type as enum ('starter', 'growth', 'enterprise');

create table organisations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  plan                    plan_type not null default 'starter',
  license_paid_at         timestamptz,
  monthly_quota           int not null default 500,
  created_at              timestamptz not null default now()
);

create table api_keys (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organisations(id) on delete cascade,
  key_hash      text not null unique,
  label         text not null,
  is_active     bool not null default true,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_api_keys_org_id on api_keys (org_id);
create index idx_api_keys_key_hash on api_keys (key_hash);

create table api_usage (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organisations(id) on delete cascade,
  api_key_id    uuid not null references api_keys(id),
  property_id   uuid references properties(id),
  endpoint      text not null,
  billed_at     timestamptz not null default now()
);

create index idx_api_usage_org_id_billed_at on api_usage (org_id, billed_at);
