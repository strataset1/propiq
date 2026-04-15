create table suburb_crawls (
  id           uuid primary key default gen_random_uuid(),
  suburb       text not null unique,
  docs_found   int not null default 0,
  searched_at  timestamptz not null default now()
);

create index idx_suburb_crawls_suburb on suburb_crawls (suburb);
