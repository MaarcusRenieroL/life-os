-- "Already told the user about this" markers for the daily attention scan, with an expiry so a
-- recurring condition (next month's budget, next cycle's bill) can notify again. Kept in Postgres so
-- a restart doesn't repeat a notification the user has already seen.
create table finance_schema.attention_claims (
  claim_key varchar(255) primary key,
  expires_at timestamptz not null
);

create index idx_attention_claims_expires_at on finance_schema.attention_claims (expires_at);
