-- Payday is detected from salary credits until the user chooses one by hand.
alter table finance_schema.user_finance_settings
  add column pay_cycle_auto boolean not null default true;
-- anyone who already moved it off the 1st chose that themselves
update finance_schema.user_finance_settings set pay_cycle_auto = false where pay_cycle_start_day <> 1;
