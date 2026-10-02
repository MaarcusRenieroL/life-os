-- 0 now means "the last working day of the month"; 1-28 stay a fixed day.
alter table finance_schema.user_finance_settings
  drop constraint if exists user_finance_settings_pay_cycle_start_day_check;
alter table finance_schema.user_finance_settings
  add constraint user_finance_settings_pay_cycle_start_day_check check (pay_cycle_start_day between 0 and 28);
