-- Resume & Cover Letter Builder: multi-variant resumes with section-level
-- editing, an accomplishment library, tailoring history, and full cover
-- letter generation + versioning.
--
-- Deviations from the original (MySQL-flavoured) spec, all just adapting to
-- this codebase's conventions: uuid PKs (not BIGSERIAL), no cross-service FK
-- to `users` (every other table here is the same), jsonb instead of stringly
-- JSON, timestamptz. `resume_tailorings.pdf_file_key` points at the same
-- on-disk resume storage the existing upload flow uses instead of a BYTEA
-- column, so one storage mechanism serves both.

-- ---------------------------------------------------------------------------
-- resume_variants: named, styled resume documents (base / tailored / custom)
-- ---------------------------------------------------------------------------
create table job_tracker_schema.resume_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(255) not null,
  description text,
  is_base boolean not null default false,
  is_public boolean not null default false,
  visibility varchar(20) not null default 'PRIVATE'
    check (visibility in ('PRIVATE', 'SHARED', 'PUBLIC')),
  styling_template varchar(20) not null default 'MODERN'
    check (styling_template in ('MODERN', 'CLASSIC', 'MINIMAL', 'CREATIVE', 'ELEGANT')),
  font_family varchar(100) not null default 'Calibri',
  accent_color varchar(10) not null default '#0066cc',
  section_order jsonb,
  source_resume_id uuid references job_tracker_schema.resumes (id) on delete set null,
  source_job_listing_id uuid references job_tracker_schema.job_listings (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_resume_variants_user_base on job_tracker_schema.resume_variants (user_id, is_base);

-- ---------------------------------------------------------------------------
-- resume_sections: the actual content, one row per section per variant
-- ---------------------------------------------------------------------------
create table job_tracker_schema.resume_sections (
  id uuid primary key default gen_random_uuid(),
  resume_variant_id uuid not null references job_tracker_schema.resume_variants (id) on delete cascade,
  section_type varchar(20) not null
    check (section_type in ('SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS', 'PROJECTS',
                            'CERTIFICATIONS', 'VOLUNTEER', 'LANGUAGES')),
  title varchar(255),
  content jsonb not null,
  sort_order integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_resume_sections_variant_type
  on job_tracker_schema.resume_sections (resume_variant_id, section_type);

-- ---------------------------------------------------------------------------
-- accomplishments: reusable bullet-point library
-- ---------------------------------------------------------------------------
create table job_tracker_schema.accomplishments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category varchar(100),
  bullet_text text not null,
  keywords jsonb,
  source_section_id uuid references job_tracker_schema.resume_sections (id) on delete set null,
  usage_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_accomplishments_user_category on job_tracker_schema.accomplishments (user_id, category);

-- ---------------------------------------------------------------------------
-- resume_tailorings: history of every AI tailoring run (same job, different
-- instructions = separate records, so nothing is ever overwritten)
-- ---------------------------------------------------------------------------
create table job_tracker_schema.resume_tailorings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_listing_id uuid not null references job_tracker_schema.job_listings (id) on delete cascade,
  application_id uuid references job_tracker_schema.applications (id) on delete set null,
  original_variant_id uuid not null references job_tracker_schema.resume_variants (id) on delete cascade,
  tailored_content jsonb not null,
  tailoring_prompt text,
  pdf_file_key varchar(500),
  created_at timestamptz not null default now()
);

create index idx_resume_tailorings_job_application
  on job_tracker_schema.resume_tailorings (job_listing_id, application_id);

-- ---------------------------------------------------------------------------
-- cover_letters + versions
-- ---------------------------------------------------------------------------
create table job_tracker_schema.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  application_id uuid not null unique references job_tracker_schema.applications (id) on delete cascade,
  job_listing_id uuid not null references job_tracker_schema.job_listings (id) on delete cascade,
  resume_variant_id uuid references job_tracker_schema.resume_variants (id) on delete set null,
  generated_content text not null,
  custom_edits text,
  tone varchar(20) not null default 'PROFESSIONAL'
    check (tone in ('PROFESSIONAL', 'ENTHUSIASTIC', 'CASUAL', 'FORMAL')),
  style varchar(20) not null default 'TRADITIONAL'
    check (style in ('TRADITIONAL', 'CREATIVE', 'CONCISE', 'STORYTELLING')),
  is_customized boolean not null default false,
  template_used varchar(255),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cover_letters_application on job_tracker_schema.cover_letters (application_id);

create table job_tracker_schema.cover_letter_versions (
  id uuid primary key default gen_random_uuid(),
  cover_letter_id uuid not null references job_tracker_schema.cover_letters (id) on delete cascade,
  version integer not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (cover_letter_id, version)
);

-- ---------------------------------------------------------------------------
-- templates (cover letter + resume styling)
-- ---------------------------------------------------------------------------
create table job_tracker_schema.cover_letter_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name varchar(255) not null,
  description text,
  content_structure jsonb,
  tone varchar(20),
  style varchar(20),
  is_public boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index uq_cover_letter_templates_user_name
  on job_tracker_schema.cover_letter_templates (user_id, name) where user_id is not null;
create unique index uq_cover_letter_templates_system_name
  on job_tracker_schema.cover_letter_templates (name) where user_id is null;

create table job_tracker_schema.resume_templates (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null unique,
  description text,
  styling_config jsonb,
  section_layout jsonb,
  is_system boolean not null default true
);

-- ---------------------------------------------------------------------------
-- resume_keyword_matches: historical keyword-optimization scores
-- ---------------------------------------------------------------------------
create table job_tracker_schema.resume_keyword_matches (
  id uuid primary key default gen_random_uuid(),
  resume_variant_id uuid not null references job_tracker_schema.resume_variants (id) on delete cascade,
  job_listing_id uuid not null references job_tracker_schema.job_listings (id) on delete cascade,
  matched_keywords jsonb,
  missing_keywords jsonb,
  keyword_density numeric(5, 2),
  score integer check (score is null or (score between 0 and 100)),
  analyzed_at timestamptz not null default now()
);

create index idx_resume_keyword_matches_variant
  on job_tracker_schema.resume_keyword_matches (resume_variant_id, analyzed_at desc);

-- ---------------------------------------------------------------------------
-- seed data: 5 system resume styling templates, 5 system cover letter templates
-- ---------------------------------------------------------------------------
insert into job_tracker_schema.resume_templates (name, description, styling_config, section_layout, is_system) values
  ('Modern', 'Clean sans-serif with a sidebar for skills/contact.',
   '{"fontFamily":"Calibri","accentColor":"#0066cc","layout":"sidebar"}',
   '["summary","experience","projects","education","skills","certifications"]', true),
  ('Classic', 'Traditional single-column serif resume.',
   '{"fontFamily":"Georgia","accentColor":"#1a1a1a","layout":"single-column"}',
   '["summary","experience","education","skills","certifications","projects"]', true),
  ('Minimal', 'Understated, generous whitespace, no accent color blocks.',
   '{"fontFamily":"Helvetica","accentColor":"#333333","layout":"single-column"}',
   '["experience","education","skills","projects","certifications"]', true),
  ('Creative', 'Bold section headers, accent color throughout.',
   '{"fontFamily":"Poppins","accentColor":"#7c3aed","layout":"sidebar"}',
   '["summary","experience","projects","skills","education","certifications"]', true),
  ('Elegant', 'Refined serif headers over a sans-serif body.',
   '{"fontFamily":"Playfair Display","accentColor":"#8a6d3b","layout":"single-column"}',
   '["summary","experience","education","skills","volunteer","certifications"]', true);

insert into job_tracker_schema.cover_letter_templates (user_id, name, description, content_structure, tone, style, is_public, is_system) values
  (null, 'Traditional', 'Formal business letter structure.',
   '{"sections":["greeting","hook","skillsAlignment","story","closing"]}', 'PROFESSIONAL', 'TRADITIONAL', true, true),
  (null, 'Startup', 'Energetic, direct, leads with why the company specifically.',
   '{"sections":["hook","skillsAlignment","story","closing"]}', 'ENTHUSIASTIC', 'CONCISE', true, true),
  (null, 'Big Tech', 'Structured, metrics-forward, understated tone.',
   '{"sections":["greeting","skillsAlignment","story","closing"]}', 'PROFESSIONAL', 'CONCISE', true, true),
  (null, 'Consultant', 'Narrative-driven, emphasizes problem-solving stories.',
   '{"sections":["greeting","hook","story","skillsAlignment","closing"]}', 'FORMAL', 'STORYTELLING', true, true),
  (null, 'Creative Role', 'Personality-forward opening, casual but polished.',
   '{"sections":["hook","story","skillsAlignment","closing"]}', 'CASUAL', 'CREATIVE', true, true);
