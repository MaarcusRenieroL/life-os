-- New and changed master passwords derive the vault key with more PBKDF2 iterations. Existing rows keep the
-- count they were created with (65536) until the master password is changed, which re-encrypts everything.
alter table vault_schema.vault_master_passwords add column kdf_iterations integer;
