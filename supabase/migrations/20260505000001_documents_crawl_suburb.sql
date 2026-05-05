alter table documents add column if not exists crawl_suburb text;
create index if not exists idx_documents_crawl_suburb on documents (crawl_suburb) where crawl_suburb is not null;
