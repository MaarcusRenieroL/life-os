-- Mirrors services/tasks' V2: area_id (a bare, meaningless UUID with no backing table) becomes a
-- closed enum matching the product spec's fixed six life categories.

alter table calendar_schema.events drop column area_id;

alter table calendar_schema.events add column area varchar(20)
  check (area in ('CAREER', 'HEALTH', 'FINANCE', 'LEARNING', 'RELATIONSHIPS', 'PERSONAL'));
