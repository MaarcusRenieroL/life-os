alter table vault_schema.recovery_codes
  add column key_salt varchar(255),
  add column wrapped_key_ciphertext text,
  add column wrapped_key_iv varchar(255);
