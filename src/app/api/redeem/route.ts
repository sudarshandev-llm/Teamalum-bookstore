import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const CODE_REGEX = /^TA-PE-(1M|3M|LT)-[A-Z0-9]{6}$/;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const trimmedCode = code.trim().toUpperCase();

    if (!CODE_REGEX.test(trimmedCode)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const { data: redeemCode, error: fetchError } = await supabase
      .from('redeem_codes')
      .select('*')
      .eq('code', trimmedCode)
      .single();

    if (fetchError || !redeemCode) {
      return NextResponse.json({ error: 'Invalid redeem code' }, { status: 404 });
    }

    if (redeemCode.status !== 'available') {
      return NextResponse.json({ error: 'Code has already been used' }, { status: 409 });
    }

    const { data: existingLicense } = await supabase
      .from('licenses')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingLicense) {
      return NextResponse.json({ error: 'User already has an active license' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const expiresAt =
      redeemCode.plan === 'LT'
        ? null
        : new Date(Date.now() + (redeemCode.plan === '1M' ? 30 : 90) * 86400000).toISOString();

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        user_id: user.id,
        code: trimmedCode,
        plan: redeemCode.plan,
        status: 'active',
        activated_at: now,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (licenseError) {
      return NextResponse.json({ error: licenseError.message }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('redeem_codes')
      .update({ status: 'used', used_by: user.id, used_at: now })
      .eq('id', redeemCode.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'redeem_code',
      resource: 'licenses',
      resource_id: license.id,
      details: { code: trimmedCode, plan: redeemCode.plan },
    });

    return NextResponse.json({ success: true, license }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
