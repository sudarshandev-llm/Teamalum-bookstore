import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = createAdminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { count: total_users },
      { count: active_licenses },
      { count: total_redeemed },
      { count: total_books },
      { data: recent_signups },
      { data: license_breakdown },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('licenses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      admin.from('redeem_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
      admin.from('books').select('*', { count: 'exact', head: true }),
      admin.from('profiles').select('*').gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
      admin.from('licenses').select('plan'),
    ]);

    const breakdown: Record<string, number> = {};
    if (license_breakdown) {
      for (const l of license_breakdown) {
        breakdown[l.plan] = (breakdown[l.plan] || 0) + 1;
      }
    }

    return NextResponse.json({
      total_users: total_users ?? 0,
      active_licenses: active_licenses ?? 0,
      total_redeemed: total_redeemed ?? 0,
      total_books: total_books ?? 0,
      total_revenue: 0,
      recent_signups: recent_signups ?? [],
      license_breakdown: breakdown,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
