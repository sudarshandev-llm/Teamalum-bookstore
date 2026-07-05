import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { email: email.toLowerCase(), name: name || null, subscribed: true },
        { onConflict: 'email' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
