-- "Already notified" markers for the daily attention scan. They used to be Redis keys with a TTL.
create table if not exists finance_schema.attention_claims (
    claim_key  varchar(255) primary key,
    claimed_at timestamptz not null
);
