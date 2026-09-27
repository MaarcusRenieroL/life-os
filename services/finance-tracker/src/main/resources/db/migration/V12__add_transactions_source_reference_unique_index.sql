-- Every incoming bank-alert email calls existsBySourceReference (see
-- TransactionService#createFromEmailAlert) to avoid re-importing an alert that was already
-- ingested. source_reference had no index at all, so that dedup check was a sequential scan over
-- the whole transactions table on every alert.
--
-- Unique rather than a plain btree so the dedup is actually enforced by the database: the check
-- and the insert are two separate statements, so a duplicate Kafka delivery of the same alert
-- could pass both checks concurrently and insert the row twice. With this index the second insert
-- fails instead, and the ingest path treats that as "already imported" (the same outcome as the
-- existsBySourceReference short-circuit).
--
-- Partial (where source_reference is not null) because only email-alert-sourced rows carry one -
-- manual and CSV-imported transactions leave it null, and multiple nulls must stay allowed.
--
-- Not "concurrently": Flyway runs each migration inside a transaction and CREATE INDEX
-- CONCURRENTLY cannot run in one. No other migration in this repo uses it either.
create unique index if not exists idx_transactions_source_reference
  on finance_schema.transactions (source_reference)
  where source_reference is not null;
