ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.payment_methods SET name_en = CASE code
  WHEN 'paypal' THEN 'PayPal'
  WHEN 'usdt' THEN 'USDT (TRC-20)'
  WHEN 'vodafone_cash' THEN 'Vodafone Cash'
  WHEN 'instapay' THEN 'InstaPay'
  WHEN 'bank_transfer' THEN 'Bank Transfer'
  ELSE name_ar
END
WHERE name_en IS NULL;