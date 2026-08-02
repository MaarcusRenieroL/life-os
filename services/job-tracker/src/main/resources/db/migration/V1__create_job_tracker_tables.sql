create schema if not exists jobs_schema;

create table jobs_schema.jobs (
  id uuid primary key not null,
  user_id uuid not null,
  company varchar(200) not null,
  job_title varchar(150) not null,
  location varchar(100) not null,
  country varchar(50) not null,
  work_model varchar(50) not null,
  salary_min decimal,
  salary_max decimal,
  currency varchar(3),
  job_url text,
  job_description text,
  job_description_html text,
  source varchar(30) not null,
  source_url text,
  scrape_timestamp timestamptz,
  required_skills jsonb,
  nice_to_have_skills jsonb,
  experience_years integer,
  seniority varchar(20) not null,
  application_deadline timestamptz,
  status varchar(30) not null,
  tags jsonb,
  notes text,
  saved_at timestamptz,
  discovered_at timestamptz,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz,
  de_duplicated_with_job_id uuid,
  unique (user_id, job_url)
);

create table jobs_schema.applications (
  id uuid primary key not null,
  job_id uuid not null references jobs_schema.jobs(id),
  user_id uuid not null,
  application_date timestamptz,
  resume_version varchar(50),
  resume_s3_path text,
  resume_generation_timestamp timestamptz,
  resume_tailoring_prompt text,
  resume_tailoring_reasoning text,
  cover_letter_submitted boolean,
  cover_letter_s3_path text,
  ai_score_percentage integer,
  ai_score_reasoning text,
  ai_recommended_sections jsonb,
  ai_interview_prep_topics jsonb,
  linked_note_ids jsonb,
  current_stage varchar(50),
  rejection_reason text,
  rejection_date timestamptz,
  withdrawn_reason text,
  withdrawn_date timestamptz,
  offer_details jsonb,
  last_follow_up_date timestamptz,
  next_follow_up_date timestamptz,
  status varchar(50),
  notes text,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

create table jobs_schema.application_interviews (
  id uuid primary key not null,
  application_id uuid not null references jobs_schema.applications(id),
  round integer,
  round_name varchar(100),
  round_type varchar(50),
  scheduled_date timestamptz,
  scheduled_time time,
  meeting_link text,
  interviewer_name varchar(150),
  interviewer_title varchar(100),
  topics jsonb,
  preparation_notes text,
  questions_asked text,
  performance_review text,
  result varchar(50),
  result_date timestamptz,
  feedback text,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

create table jobs_schema.contacts (
  id uuid primary key not null,
  user_id uuid not null,
  name varchar(200) not null,
  title varchar(150),
  company varchar(200),
  linkedin_url text,
  email varchar(255),
  phone varchar(20),
  notes text,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

create table jobs_schema.application_contact_link (
  id uuid primary key not null,
  application_id uuid not null references jobs_schema.applications(id),
  contact_id uuid not null references jobs_schema.contacts(id),
  referral_message_sent boolean default false,
  referral_message_content text,
  referral_message_sent_date timestamptz,
  referral_response_received boolean default false,
  referral_response_content text,
  referral_response_date timestamptz,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

create table jobs_schema.resume_templates (
  id uuid primary key not null,
  user_id uuid not null,
  s3_path text not null,
  uploaded_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp,
  version varchar(20),
  is_active boolean default false,
  created_at timestamptz default current_timestamp
);

create table jobs_schema.company_intelligence (
  id uuid primary key not null,
  company_name varchar(200) unique not null,
  company_website text,
  linkedin_profile_url text,
  founded_year integer,
  headquarters varchar(100),
  employee_count varchar(50),
  industry varchar(100),
  summary text,
  glassdoor_rating decimal(3, 1),
  glassdoor_review_count integer,
  blind_sentiment varchar(50),
  interview_difficulty varchar(50),
  average_interview_duration varchar(50),
  common_round_types jsonb,
  reviews_data jsonb,
  financial_data jsonb,
  team_data jsonb,
  scraped_at timestamptz,
  created_at timestamptz default current_timestamp,
  last_updated_at timestamptz default current_timestamp
);

create table jobs_schema.company_reviews (
  id uuid primary key not null,
  company_id uuid not null references jobs_schema.company_intelligence(id),
  source varchar(50),
  review_text text,
  rating decimal(3, 1),
  title varchar(200),
  pros text,
  cons text,
  interview_experience text,
  salary varchar(100),
  role varchar(100),
  scraped_at timestamptz,
  created_at timestamptz default current_timestamp
);

create table jobs_schema.notifications (
  id uuid primary key not null,
  user_id uuid not null,
  reference_type varchar(50),
  reference_id uuid,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default current_timestamp
);

create table jobs_schema.notification_settings (
  id uuid primary key not null,
  user_id uuid not null unique,
  email_on_stage_change boolean default true,
  email_on_interview_scheduled boolean default true,
  email_on_offer_received boolean default true,
  email_on_follow_up_due boolean default true,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

create table jobs_schema.categorization_rules (
  id uuid primary key not null,
  user_id uuid not null,
  rule_name varchar(200) not null,
  rule_type varchar(50),
  match_field varchar(50),
  match_value text,
  target_category uuid,
  is_active boolean default true,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

-- Indexes
create index idx_jobs_user_id on jobs_schema.jobs(user_id);
create index idx_jobs_company on jobs_schema.jobs(company);
create index idx_jobs_status on jobs_schema.jobs(status);
create index idx_jobs_source on jobs_schema.jobs(source);
create index idx_jobs_deduplicated_with on jobs_schema.jobs(de_duplicated_with_job_id);
create index idx_applications_user_id on jobs_schema.applications(user_id);
create index idx_applications_job_id on jobs_schema.applications(job_id);
create index idx_applications_stage on jobs_schema.applications(current_stage);
create index idx_interviews_application_id on jobs_schema.application_interviews(application_id);
create index idx_contacts_user_id on jobs_schema.contacts(user_id);
create index idx_application_contact_link_application_id on jobs_schema.application_contact_link(application_id);
create index idx_application_contact_link_contact_id on jobs_schema.application_contact_link(contact_id);
create index idx_company_intelligence_name on jobs_schema.company_intelligence(company_name);
create index idx_company_reviews_company_id on jobs_schema.company_reviews(company_id);
create index idx_resume_templates_user_id on jobs_schema.resume_templates(user_id);
create index idx_notifications_user_id on jobs_schema.notifications(user_id);
create index idx_categorization_rules_user_id on jobs_schema.categorization_rules(user_id);
