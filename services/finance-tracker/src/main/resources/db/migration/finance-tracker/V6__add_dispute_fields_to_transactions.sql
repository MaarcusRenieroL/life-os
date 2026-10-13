alter table finance_schema.transactions
add column dispute_reason varchar(500),
add column dispute_date timestamptz;
