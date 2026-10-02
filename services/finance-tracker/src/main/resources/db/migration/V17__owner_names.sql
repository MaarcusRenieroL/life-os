-- Names the account holder appears under in bank narrations (UPI, NEFT, IMPS). A transaction whose
-- description contains one of them is money moving between the user's own accounts, not spending or income.
alter table finance_schema.user_finance_settings add column owner_names varchar(500);
