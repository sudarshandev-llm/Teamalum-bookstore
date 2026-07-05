import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (!code) {
      return NextResponse.redirect(new URL('/error?message=Missing%20auth%20code', origin));
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL(`/error?message=${encodeURIComponent(error.message)}`, origin));
    }

    return NextResponse.redirect(new URL(next, origin));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
