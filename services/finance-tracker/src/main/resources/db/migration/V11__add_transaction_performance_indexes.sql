-- Performance indexes for the transaction hot paths:
--  * list/search (TransactionSpecifications) filters by user_id and sorts by
--    transaction_date desc on every call.
--  * CSV import dedup check (existsByAccountIdAndAmountAndTransactionDateBetweenAndDescription)
--    hits account_id per imported row.
--  * description search uses a case-insensitive LIKE '%...%', which needs a
--    trigram index (not a plain btree) to avoid a sequential scan.
create extension if not exists pg_trgm;

create index idx_transactions_user_id_transaction_date
  on finance_schema.transactions (user_id, transaction_date desc);

create index idx_transactions_account_id
  on finance_schema.transactions (account_id);

create index idx_transactions_description_trgm
  on finance_schema.transactions using gin (lower(description) gin_trgm_ops);
