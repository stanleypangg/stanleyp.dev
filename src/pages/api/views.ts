export const prerender = false;

import { createServerClient } from '../../lib/supabase';

export async function GET() {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .eq('page_path', '/');

  if (error) {
    return json({ error: 'Failed to fetch count' }, 500);
  }
  return json({ count: count ?? 0 }, 200, {
    'Cache-Control': 'private, no-cache',
  });
}

export async function POST({ request }: { request: Request }) {
  let body: { visitorId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const { visitorId } = body;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof visitorId !== 'string' || !UUID_RE.test(visitorId)) {
    return json({ ok: false, error: 'Invalid visitorId' }, 400);
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('page_views')
    .upsert(
      { visitor_id: visitorId, page_path: '/' },
      { onConflict: 'visitor_id,page_path', ignoreDuplicates: true }
    );

  if (error) {
    console.error('[views] Upsert failed:', error.message);
    return json({ ok: false }, 500);
  }
  return json({ ok: true });
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}
