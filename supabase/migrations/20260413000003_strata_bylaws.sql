create type attribute_value as enum ('yes', 'no', 'maybe');

create table strata_bylaws (
  id                            uuid primary key default gen_random_uuid(),
  document_id                   uuid not null references documents(id) on delete cascade,
  property_id                   uuid not null references properties(id) on delete cascade,

  -- Attribute: Short-Term Rental / Airbnb
  short_term_rental_value       attribute_value,
  short_term_rental_detail      text,
  short_term_rental_legal       text,

  -- Attribute: Pets
  pets_allowed_value            attribute_value,
  pets_allowed_detail           text,
  pets_allowed_legal            text,

  -- Attribute: Interior Renovations
  interior_renovations_value    attribute_value,
  interior_renovations_detail   text,
  interior_renovations_legal    text,

  -- Attribute: Exterior Renovations
  exterior_renovations_value    attribute_value,
  exterior_renovations_detail   text,
  exterior_renovations_legal    text,

  -- AI metadata
  confidence                    float check (confidence >= 0 and confidence <= 1),
  model_version                 text,
  processed_at                  timestamptz not null default now(),
  created_at                    timestamptz not null default now(),

  unique (document_id)
);

create index idx_strata_bylaws_property_id on strata_bylaws (property_id);
create index idx_strata_bylaws_short_term_rental on strata_bylaws (short_term_rental_value);
create index idx_strata_bylaws_pets_allowed on strata_bylaws (pets_allowed_value);
