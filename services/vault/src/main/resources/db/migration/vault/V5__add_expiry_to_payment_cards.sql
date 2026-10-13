alter table vault_schema.payment_cards
  add column expiry_encrypted text,
  add column expiry_ivv varchar(255);
