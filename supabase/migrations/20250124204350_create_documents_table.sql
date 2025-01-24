create type document_category as enum ('manuals', 'how-to', 'faqs', 'other');

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  category document_category not null,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  organization_id uuid not null references organizations(id) on delete cascade,
  uploaded_by uuid not null references users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);
