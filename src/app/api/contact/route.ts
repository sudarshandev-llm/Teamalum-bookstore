import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Name, email, subject, and message are required' }, { status: 400 });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof subject !== 'string' || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid field types' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('contact_messages').insert({
      name,
      email,
      phone: phone || null,
      subject,
      message,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
