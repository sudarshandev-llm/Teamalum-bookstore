import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateLicenseCode } from '@/lib/utils';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { error: 'Forbidden', status: 403 };
  }

  return { user, profile };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    const admin = createAdminClient();

    let query = admin
      .from('licenses')
      .select('*, profiles(full_name, email)', { count: 'exact' });

    if (search) {
      query = query.or(`code.ilike.%${search}%,user_id.ilike.%${search}%`);
    }

    const { data: licenses, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      licenses,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, plan, count } = body;

    if (action !== 'generate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!['1M', '3M', 'LT'].includes(plan)) {
      return NextResponse.json({ error: 'Plan must be 1M, 3M, or LT' }, { status: 400 });
    }

    const numCount = Math.min(100, Math.max(1, parseInt(count, 10) || 1));

    const admin = createAdminClient();
    const codes = [];

    for (let i = 0; i < numCount; i++) {
      codes.push({
        code: generateLicenseCode(plan as '1M' | '3M' | 'LT'),
        plan,
        status: 'available',
        created_by: auth.user.id,
      });
    }

    const { data: inserted, error } = await admin
      .from('redeem_codes')
      .insert(codes)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.from('audit_logs').insert({
      user_id: auth.user.id,
      action: 'generate_codes',
      resource: 'redeem_codes',
      details: { plan, count: numCount, codes: inserted?.map((c: { code: string }) => c.code) },
    });

    return NextResponse.json({ success: true, codes: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
