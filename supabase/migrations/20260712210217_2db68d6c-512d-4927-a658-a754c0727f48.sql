CREATE OR REPLACE FUNCTION public.admin_adjust_coins(_user_id uuid, _delta integer, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _bal int;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'delta must not be zero'; END IF;
  INSERT INTO public.wallets(user_id, coins) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET coins = GREATEST(coins + _delta, 0), updated_at=now() WHERE user_id=_user_id RETURNING coins INTO _bal;
  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note, counterparty_id)
    VALUES (_user_id, CASE WHEN _delta >= 0 THEN 'admin_credit' ELSE 'admin_debit' END, _delta, _bal, _note, auth.uid());
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'admin_adjust_coins', 'user', _user_id, jsonb_build_object('delta',_delta,'note',_note));
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (
      _user_id,
      CASE WHEN _delta >= 0 THEN 'coins_credited' ELSE 'coins_debited' END,
      CASE WHEN _delta >= 0 THEN 'تم إضافة عملات إلى محفظتك' ELSE 'تم خصم عملات من محفظتك' END,
      CASE WHEN _delta >= 0 THEN ('+' || _delta::text || ' عملة' || COALESCE(' — ' || _note, ''))
           ELSE (_delta::text || ' عملة' || COALESCE(' — ' || _note, '')) END,
      '/wallet'
    );
  RETURN jsonb_build_object('ok',true,'balance',_bal);
END $function$;