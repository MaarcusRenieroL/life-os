create table vault_schema.payment_cards (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null,
  nickname varchar(255),
  network varchar(20) not null,
  last_four_digits integer not null,
  card_number_encrypted text,
  card_number_ivv varchar(255),
  password_encrypted text,
  password_ivv varchar(255),
  cvv_encrypted text,
  cvv_ivv varchar(255),
  card_holder_name varchar(255),
  billing_zip varchar(20),
  created_at timestamptz default now (),
  updated_at timestamptz default now ()
);

create index idx_payment_cards_user_id on vault_schema.payment_cards (user_id);
