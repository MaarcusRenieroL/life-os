-- Emails are compared case-insensitively in code; make the database agree so two spellings can never be
-- two accounts, and let a biometric device id belong to one enrollment only.
create unique index if not exists uq_users_email_lower on auth_schema.users (lower(email));
create unique index if not exists uq_biometric_enrollments_device_id on auth_schema.biometric_enrollments (device_id);
