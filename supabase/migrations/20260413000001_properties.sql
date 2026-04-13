create type property_status as enum ('processing', 'ready', 'failed');

create table properties (
  id                  uuid primary key default gen_random_uuid(),
  address_raw         text not null,
  address_normalised  text,
  suburb              text,
  state               text,
  postcode            text,
  lat                 float,
  lng                 float,
  status              property_status not null default 'processing',
  last_crawled_at     timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_properties_address_normalised on properties (address_normalised);
create index idx_properties_status on properties (status);
