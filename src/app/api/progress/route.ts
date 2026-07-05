import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: progress, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ progress });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { book_id, chapter_id, progress, last_position, completed, time_spent_seconds } = body;

    if (!book_id || !chapter_id) {
      return NextResponse.json({ error: 'book_id and chapter_id are required' }, { status: 400 });
    }

    const { data: record, error } = await supabase
      .from('reading_progress')
      .upsert(
        {
          user_id: user.id,
          book_id,
          chapter_id,
          progress: progress ?? 0,
          last_position: last_position || null,
          completed: completed ?? false,
          time_spent_seconds: time_spent_seconds ?? 0,
        },
        { onConflict: 'user_id,book_id,chapter_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, record });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
