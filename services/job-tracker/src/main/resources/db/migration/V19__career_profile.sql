-- The candidate's structured career history - contact/summary, work experience, and projects -
-- entered once (by upload or manual form) during a mandatory onboarding step, and read from
-- directly for every tailored resume from then on, instead of re-parsing one static PDF's text.
CREATE TABLE job_tracker_schema.career_profiles (
  user_id UUID PRIMARY KEY,
  full_name VARCHAR(200),
  email VARCHAR(320),
  phone VARCHAR(50),
  location VARCHAR(300),
  github_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_tracker_schema.work_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(300) NOT NULL,
  company VARCHAR(300) NOT NULL,
  location VARCHAR(300),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  bullets_json JSONB,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_experiences_user ON job_tracker_schema.work_experiences (user_id, display_order);

CREATE TABLE job_tracker_schema.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  tech_stack_json JSONB,
  link VARCHAR(500),
  start_date DATE,
  end_date DATE,
  bullets_json JSONB,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_user ON job_tracker_schema.projects (user_id, display_order);
