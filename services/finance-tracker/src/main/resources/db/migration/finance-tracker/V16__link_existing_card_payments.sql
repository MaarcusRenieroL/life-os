-- Card payments were booked twice by email alerts: a debit on the bank account and a "payment
-- received" credit on the credit card, so one movement of the user's own money looked like an expense.
-- Link the pairs that are already in the books (one-to-one, same amount, within a day) as transfers,
-- the same way new alerts are linked from now on. Anything with more than one possible partner is left alone.
with pairs as (
  select d.id as debit_id, c.id as credit_id, gen_random_uuid() as pair_id,
         row_number() over (partition by d.id order by abs(extract(epoch from (d.transaction_date - c.transaction_date)))) as d_rank,
         row_number() over (partition by c.id order by abs(extract(epoch from (d.transaction_date - c.transaction_date)))) as c_rank,
         count(*) over (partition by d.id) as d_options,
         count(*) over (partition by c.id) as c_options
  from finance_schema.transactions d
  join finance_schema.accounts da on da.id = d.account_id and da.account_type <> 'CREDIT_CARD'
  join finance_schema.transactions c on c.user_id = d.user_id and c.amount = d.amount and c.type = 'CREDIT'
  join finance_schema.accounts ca on ca.id = c.account_id and ca.account_type = 'CREDIT_CARD'
  where d.type = 'DEBIT' and d.source_type = 'EMAIL_ALERT' and c.source_type = 'EMAIL_ALERT'
    and not d.is_transfer and not c.is_transfer and not d.is_duplicate and not c.is_duplicate
    and abs(extract(epoch from (d.transaction_date - c.transaction_date))) <= 86400
), unambiguous as (
  select * from pairs where d_options = 1 and c_options = 1
)
update finance_schema.transactions t
set is_transfer = true, transfer_pair_id = u.pair_id, category_id = null
from unambiguous u
where t.id in (u.debit_id, u.credit_id);
