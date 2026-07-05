import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'export') {
      const admin = createAdminClient();
      const { data: codes, error } = await admin
        .from('redeem_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const headers = ['code', 'plan', 'status', 'used_by', 'used_at', 'created_at'];
      const csvRows = [headers.join(',')];

      for (const c of codes) {
        csvRows.push(
          [c.code, c.plan, c.status, c.used_by || '', c.used_at || '', c.created_at].join(',')
        );
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="redeem-codes-${Date.now()}.csv"`,
        },
      });
    }

    if (action === 'import') {
      return NextResponse.json({ error: 'Import not yet implemented' }, { status: 501 });
    }

    return NextResponse.json({ error: 'Invalid action. Use "export" or "import".' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
