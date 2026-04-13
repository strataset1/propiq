create type document_type as enum (
  'strata',
  'building_inspection',
  'contract',
  'lease',
  'council',
  'other'
);

create type ingested_via as enum ('manual', 'crawler', 'agent');

create table documents (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references properties(id) on delete cascade,
  type            document_type not null,
  label           text not null,
  source_url      text,
  storage_path    text,
  file_hash       text unique,
  page_count      int,
  extracted_text  text,
  ingested_via    ingested_via not null,
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_documents_property_id on documents (property_id);
create index idx_documents_processed_at on documents (processed_at) where processed_at is null;
create index idx_documents_file_hash on documents (file_hash);
