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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const book_id = searchParams.get('book_id');

    if (!book_id) {
      return NextResponse.json({ error: 'book_id query parameter is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: chapters, error } = await admin
      .from('chapters')
      .select('*')
      .eq('book_id', book_id)
      .order('chapter_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ chapters });
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
    const { id, book_id, title, slug, chapter_number, content, preview_content, is_premium, is_free_preview, status, word_count, estimated_minutes, metadata } = body;

    if (!book_id || !title) {
      return NextResponse.json({ error: 'book_id and title are required' }, { status: 400 });
    }

    const admin = createAdminClient();

    if (id) {
      const { data: chapter, error } = await admin
        .from('chapters')
        .update({
          title,
          slug: slug || undefined,
          chapter_number: chapter_number ?? undefined,
          content: content ?? undefined,
          preview_content: preview_content ?? undefined,
          is_premium: is_premium ?? undefined,
          is_free_preview: is_free_preview ?? undefined,
          status: status ?? undefined,
          word_count: word_count ?? undefined,
          estimated_minutes: estimated_minutes ?? undefined,
          metadata: metadata ?? undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, chapter });
    }

    const { data: chapter, error } = await admin
      .from('chapters')
      .insert({
        book_id,
        title,
        slug: slug || null,
        chapter_number: chapter_number ?? null,
        content: content ?? null,
        preview_content: preview_content ?? null,
        is_premium: is_premium ?? false,
        is_free_preview: is_free_preview ?? false,
        status: status ?? 'draft',
        word_count: word_count ?? null,
        estimated_minutes: estimated_minutes ?? null,
        metadata: metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, chapter }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
