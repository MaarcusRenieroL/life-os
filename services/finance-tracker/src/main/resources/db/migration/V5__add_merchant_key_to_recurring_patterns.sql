alter table finance_schema.recurring_patterns
  add column merchant_key varchar(150);

create index idx_recurring_patterns_user_id_merchant_key
  on finance_schema.recurring_patterns (user_id, merchant_key);
