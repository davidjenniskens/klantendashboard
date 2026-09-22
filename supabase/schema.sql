-- Voer dit één keer uit in de Supabase SQL editor van je project.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  website_url text,
  tags text[] default '{}',
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists feedback_moments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  type text not null default 'feedback' check (type in ('feedback', 'update')),
  title text not null,
  date timestamptz default now(),
  original_images text[] default '{}',
  motivation_original text,
  feedback_text text,
  new_images text[] default '{}',
  motivation_new text,
  reflection_text text,
  body_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Alle server-side toegang loopt via de service role key (in de API routes),
-- die RLS altijd omzeilt. RLS staat daarom uit: er zijn geen klantlogins die
-- rechtstreeks met de database praten.
alter table clients disable row level security;
alter table feedback_moments disable row level security;

-- Storage: maak in de Supabase dashboard (Storage) een bucket genaamd
-- "feedback-images" aan, ingesteld als PUBLIC (read-only voor iedereen met
-- de link, alleen de service role kan uploaden/verwijderen). Geen extra
-- policy-SQL nodig zolang de bucket op "public" staat.
