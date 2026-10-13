-- Adds EVENT to the set of modules a note can link to, for the new calendar module's
-- "link calendar event to notes" integration point.

alter table notes_schema.note_module_links
  drop constraint note_module_links_module_type_check;

alter table notes_schema.note_module_links
  add constraint note_module_links_module_type_check
  check (module_type in ('PROJECT', 'GOAL', 'TASK', 'JOB_APPLICATION', 'HABIT', 'EVENT'));
