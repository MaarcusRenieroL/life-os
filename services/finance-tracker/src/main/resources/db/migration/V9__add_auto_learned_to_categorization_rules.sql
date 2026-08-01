alter table finance_schema.categorization_rules
    add column auto_learned boolean not null default false;

-- One-time cleanup: where an auto-learned rule duplicates a user-created rule
-- (same user, match field, and match value), the user's own rule wins - drop
-- the auto-learned copy so the same correction isn't represented twice.
delete from finance_schema.categorization_rules auto
using finance_schema.categorization_rules manual
where auto.auto_learned = true
  and manual.auto_learned = false
  and auto.user_id = manual.user_id
  and auto.match_field = manual.match_field
  and lower(auto.match_value) = lower(manual.match_value);
