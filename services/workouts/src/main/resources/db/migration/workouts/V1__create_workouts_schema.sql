-- Workouts module: exercise library, routines (plus pre-built templates), sessions and their sets,
-- personal records and body measurements.
--
-- goal_id / calendar_event_id on sessions are deliberately plain uuid columns with no foreign key:
-- goals live in tasks_schema and events in calendar_schema, and cross-schema FKs would couple these
-- services' migrations (same convention as habit_tracker_schema.habits.goal_id).

create table workouts_schema.exercises (
  id uuid primary key default gen_random_uuid(),
  -- null = part of the built-in library, visible to everyone
  user_id uuid,
  name varchar(120) not null,
  category varchar(20) not null
    check (category in ('CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'CARDIO', 'FULL_BODY')),
  equipment varchar(20) not null
    check (equipment in ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'OTHER')),
  instructions text,
  created_at timestamptz not null default now()
);

create unique index uq_exercises_builtin_name on workouts_schema.exercises (lower(name)) where user_id is null;
create unique index uq_exercises_user_name on workouts_schema.exercises (user_id, lower(name)) where user_id is not null;
create index idx_exercises_user_id on workouts_schema.exercises (user_id);

create table workouts_schema.routines (
  id uuid primary key default gen_random_uuid(),
  -- null = a pre-built template, copied into the user's own routines on demand
  user_id uuid,
  name varchar(120) not null,
  description text,
  template_group varchar(60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_routines_user_id on workouts_schema.routines (user_id);

create table workouts_schema.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references workouts_schema.routines (id) on delete cascade,
  exercise_id uuid not null references workouts_schema.exercises (id),
  position integer not null,
  target_sets integer not null default 3,
  target_reps integer not null default 10,
  target_weight numeric(7, 2),
  rest_seconds integer not null default 90
);

create index idx_routine_exercises_routine_id on workouts_schema.routine_exercises (routine_id, position);

create table workouts_schema.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  routine_id uuid references workouts_schema.routines (id) on delete set null,
  name varchar(120) not null,
  status varchar(20) not null check (status in ('PLANNED', 'IN_PROGRESS', 'COMPLETED')),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  notes text,
  goal_id uuid,
  calendar_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workout_sessions_user_status on workouts_schema.workout_sessions (user_id, status);
create index idx_workout_sessions_user_completed on workouts_schema.workout_sessions (user_id, completed_at desc);

create table workouts_schema.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workouts_schema.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references workouts_schema.exercises (id),
  exercise_position integer not null,
  set_number integer not null,
  target_reps integer,
  target_weight numeric(7, 2),
  actual_reps integer,
  actual_weight numeric(7, 2),
  rest_seconds integer,
  completed boolean not null default false,
  completed_at timestamptz,
  is_pr boolean not null default false
);

create index idx_session_sets_session_id on workouts_schema.session_sets (session_id, exercise_position, set_number);
create index idx_session_sets_exercise_id on workouts_schema.session_sets (exercise_id);

create table workouts_schema.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exercise_id uuid not null references workouts_schema.exercises (id),
  weight numeric(7, 2) not null,
  reps integer not null,
  achieved_at timestamptz not null default now(),
  session_id uuid references workouts_schema.workout_sessions (id) on delete set null
);

create index idx_personal_records_user_exercise on workouts_schema.personal_records (user_id, exercise_id, weight desc);

create table workouts_schema.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  measured_on date not null,
  weight_kg numeric(6, 2),
  chest_cm numeric(5, 1),
  waist_cm numeric(5, 1),
  arms_cm numeric(5, 1),
  legs_cm numeric(5, 1),
  body_fat_pct numeric(4, 1),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_body_measurements_user_date on workouts_schema.body_measurements (user_id, measured_on desc);

-- Built-in exercise library.
insert into workouts_schema.exercises (name, category, equipment) values
  ('Barbell Bench Press', 'CHEST', 'BARBELL'),
  ('Incline Dumbbell Press', 'CHEST', 'DUMBBELL'),
  ('Dumbbell Fly', 'CHEST', 'DUMBBELL'),
  ('Push-Up', 'CHEST', 'BODYWEIGHT'),
  ('Cable Crossover', 'CHEST', 'CABLE'),
  ('Chest Dip', 'CHEST', 'BODYWEIGHT'),
  ('Deadlift', 'BACK', 'BARBELL'),
  ('Barbell Row', 'BACK', 'BARBELL'),
  ('Pull-Up', 'BACK', 'BODYWEIGHT'),
  ('Lat Pulldown', 'BACK', 'CABLE'),
  ('Seated Cable Row', 'BACK', 'CABLE'),
  ('One-Arm Dumbbell Row', 'BACK', 'DUMBBELL'),
  ('Overhead Press', 'SHOULDERS', 'BARBELL'),
  ('Lateral Raise', 'SHOULDERS', 'DUMBBELL'),
  ('Face Pull', 'SHOULDERS', 'CABLE'),
  ('Arnold Press', 'SHOULDERS', 'DUMBBELL'),
  ('Rear Delt Fly', 'SHOULDERS', 'DUMBBELL'),
  ('Barbell Curl', 'ARMS', 'BARBELL'),
  ('Dumbbell Curl', 'ARMS', 'DUMBBELL'),
  ('Hammer Curl', 'ARMS', 'DUMBBELL'),
  ('Tricep Pushdown', 'ARMS', 'CABLE'),
  ('Skull Crusher', 'ARMS', 'BARBELL'),
  ('Overhead Tricep Extension', 'ARMS', 'DUMBBELL'),
  ('Barbell Squat', 'LEGS', 'BARBELL'),
  ('Front Squat', 'LEGS', 'BARBELL'),
  ('Leg Press', 'LEGS', 'MACHINE'),
  ('Romanian Deadlift', 'LEGS', 'BARBELL'),
  ('Walking Lunge', 'LEGS', 'DUMBBELL'),
  ('Leg Curl', 'LEGS', 'MACHINE'),
  ('Leg Extension', 'LEGS', 'MACHINE'),
  ('Standing Calf Raise', 'LEGS', 'MACHINE'),
  ('Hip Thrust', 'LEGS', 'BARBELL'),
  ('Bulgarian Split Squat', 'LEGS', 'DUMBBELL'),
  ('Plank', 'CORE', 'BODYWEIGHT'),
  ('Hanging Leg Raise', 'CORE', 'BODYWEIGHT'),
  ('Cable Crunch', 'CORE', 'CABLE'),
  ('Russian Twist', 'CORE', 'OTHER'),
  ('Ab Wheel Rollout', 'CORE', 'OTHER'),
  ('Running', 'CARDIO', 'OTHER'),
  ('Cycling', 'CARDIO', 'MACHINE'),
  ('Rowing Machine', 'CARDIO', 'MACHINE'),
  ('Jump Rope', 'CARDIO', 'OTHER'),
  ('Kettlebell Swing', 'FULL_BODY', 'KETTLEBELL'),
  ('Burpee', 'FULL_BODY', 'BODYWEIGHT'),
  ('Clean and Press', 'FULL_BODY', 'BARBELL'),
  ('Thruster', 'FULL_BODY', 'BARBELL');

-- Pre-built routine templates (user_id null), referencing the built-ins by name.
with r as (
  insert into workouts_schema.routines (name, description, template_group)
  values ('Push', 'Chest, shoulders and triceps.', 'Push/Pull/Legs')
  returning id
)
insert into workouts_schema.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
select r.id, e.id, v.pos, v.sets, v.reps, v.rest
from r
cross join (values
    ('Barbell Bench Press', 1, 4, 8, 120),
    ('Overhead Press', 2, 3, 8, 120),
    ('Incline Dumbbell Press', 3, 3, 10, 90),
    ('Lateral Raise', 4, 3, 15, 60),
    ('Tricep Pushdown', 5, 3, 12, 60)
) as v(name, pos, sets, reps, rest)
join workouts_schema.exercises e on e.name = v.name and e.user_id is null;

with r as (
  insert into workouts_schema.routines (name, description, template_group)
  values ('Pull', 'Back and biceps.', 'Push/Pull/Legs')
  returning id
)
insert into workouts_schema.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
select r.id, e.id, v.pos, v.sets, v.reps, v.rest
from r
cross join (values
    ('Deadlift', 1, 3, 5, 180),
    ('Pull-Up', 2, 4, 8, 120),
    ('Barbell Row', 3, 3, 8, 120),
    ('Face Pull', 4, 3, 15, 60),
    ('Barbell Curl', 5, 3, 10, 60)
) as v(name, pos, sets, reps, rest)
join workouts_schema.exercises e on e.name = v.name and e.user_id is null;

with r as (
  insert into workouts_schema.routines (name, description, template_group)
  values ('Legs', 'Quads, hamstrings, glutes and calves.', 'Push/Pull/Legs')
  returning id
)
insert into workouts_schema.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
select r.id, e.id, v.pos, v.sets, v.reps, v.rest
from r
cross join (values
    ('Barbell Squat', 1, 4, 8, 150),
    ('Romanian Deadlift', 2, 3, 8, 120),
    ('Leg Press', 3, 3, 12, 90),
    ('Leg Curl', 4, 3, 12, 60),
    ('Standing Calf Raise', 5, 4, 15, 60)
) as v(name, pos, sets, reps, rest)
join workouts_schema.exercises e on e.name = v.name and e.user_id is null;

with r as (
  insert into workouts_schema.routines (name, description, template_group)
  values ('Upper Body', 'Everything above the waist.', 'Upper/Lower')
  returning id
)
insert into workouts_schema.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
select r.id, e.id, v.pos, v.sets, v.reps, v.rest
from r
cross join (values
    ('Barbell Bench Press', 1, 4, 8, 120),
    ('Barbell Row', 2, 4, 8, 120),
    ('Overhead Press', 3, 3, 10, 90),
    ('Lat Pulldown', 4, 3, 10, 90),
    ('Dumbbell Curl', 5, 3, 12, 60),
    ('Tricep Pushdown', 6, 3, 12, 60)
) as v(name, pos, sets, reps, rest)
join workouts_schema.exercises e on e.name = v.name and e.user_id is null;

with r as (
  insert into workouts_schema.routines (name, description, template_group)
  values ('Lower Body', 'Legs and core.', 'Upper/Lower')
  returning id
)
insert into workouts_schema.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
select r.id, e.id, v.pos, v.sets, v.reps, v.rest
from r
cross join (values
    ('Barbell Squat', 1, 4, 6, 150),
    ('Romanian Deadlift', 2, 3, 8, 120),
    ('Walking Lunge', 3, 3, 10, 90),
    ('Leg Curl', 4, 3, 12, 60),
    ('Standing Calf Raise', 5, 4, 15, 60),
    ('Hanging Leg Raise', 6, 3, 12, 60)
) as v(name, pos, sets, reps, rest)
join workouts_schema.exercises e on e.name = v.name and e.user_id is null;

with r as (
  insert into workouts_schema.routines (name, description, template_group)
  values ('Full Body', 'One session that hits everything.', 'Full Body')
  returning id
)
insert into workouts_schema.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
select r.id, e.id, v.pos, v.sets, v.reps, v.rest
from r
cross join (values
    ('Barbell Squat', 1, 3, 8, 120),
    ('Barbell Bench Press', 2, 3, 8, 120),
    ('Barbell Row', 3, 3, 8, 120),
    ('Overhead Press', 4, 3, 10, 90),
    ('Romanian Deadlift', 5, 3, 10, 120),
    ('Hanging Leg Raise', 6, 3, 10, 60)
) as v(name, pos, sets, reps, rest)
join workouts_schema.exercises e on e.name = v.name and e.user_id is null;

