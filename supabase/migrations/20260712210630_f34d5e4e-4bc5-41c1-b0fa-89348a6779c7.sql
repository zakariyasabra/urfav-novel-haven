
ALTER TABLE public.coin_transactions DROP CONSTRAINT coin_transactions_kind_check;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_kind_check
  CHECK (kind = ANY (ARRAY['purchase','spend_unlock','spend_gift','earn_unlock','earn_gift','admin_adjust','admin_credit','admin_debit','refund']::text[]));
