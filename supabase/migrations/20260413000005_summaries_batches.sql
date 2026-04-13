create table property_summaries (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references properties(id) on delete cascade,
  summary       text,
  checklist     jsonb,
  confidence    float check (confidence >= 0 and confidence <= 1),
  model_version text,
  generated_at  timestamptz not null default now(),
  unique (property_id)
);

create table processing_batches (
  id          uuid primary key default gen_random_uuid(),
  batch_id    text not null unique,
  doc_ids     uuid[] not null,
  status      text not null default 'in_progress',
  created_at  timestamptz not null default now()
);

create index idx_processing_batches_status on processing_batches (status) where status = 'in_progress';
