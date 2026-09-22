-- Voer dit uit in de Supabase SQL editor van je bestaande project.
-- Voegt ondersteuning toe voor meerdere soorten momenten (feedbackmoment
-- vs. update) aan de bestaande feedback_moments tabel.

alter table feedback_moments
  add column if not exists type text not null default 'feedback';

alter table feedback_moments
  add column if not exists body_text text;

alter table feedback_moments
  drop constraint if exists feedback_moments_type_check;

alter table feedback_moments
  add constraint feedback_moments_type_check check (type in ('feedback', 'update'));
