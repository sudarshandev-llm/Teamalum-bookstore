-- Fix: tighten validate_code to reject null/empty codes
-- This prevents matching NULL-code purchase-intent rows via empty p_code.
create or replace function public.validate_code(
  p_code text,
  p_device_id text default null,
  p_device_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.subscriptions%rowtype;
  v_count integer;
begin
  -- Reject null or empty codes (prevents matching NULL-code purchase intents)
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  select * into rec from public.subscriptions
    where upper(code) = upper(p_code);

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if rec.status = 'revoked' then
    return jsonb_build_object('valid', false, 'reason', 'revoked');
  end if;

  if rec.expires_at is not null and rec.expires_at <= now() then
    update public.subscriptions
       set status = 'expired', updated_at = now()
     where id = rec.id and status <> 'revoked';
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  if rec.status not in ('active', 'pending') then
    return jsonb_build_object('valid', false, 'reason', rec.status);
  end if;

  if p_device_id is not null then
    select count(*) into v_count
      from public.device_activations where subscription_id = rec.id;
    if v_count >= 3 and not exists (
        select 1 from public.device_activations
         where subscription_id = rec.id and device_id = p_device_id
    ) then
      return jsonb_build_object('valid', false, 'reason', 'device_limit');
    end if;

    insert into public.device_activations
      (subscription_id, device_id, device_label)
    values (rec.id, p_device_id, p_device_label)
    on conflict (subscription_id, device_id) do nothing;

    update public.subscriptions
       set device_count = (
             select count(*) from public.device_activations where subscription_id = rec.id
           ),
           date_redeemed = coalesce(date_redeemed, now()),
           status = 'active',
           updated_at = now()
     where id = rec.id;
  end if;

  return jsonb_build_object(
    'valid', true,
    'plan', rec.plan::text,
    'expires_at', rec.expires_at
  );
end;
$$;