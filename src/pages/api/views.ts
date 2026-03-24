export const prerender = false;

import { hashIp } from '../../lib/hash-ip';
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
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
  });
}

export async function POST({ clientAddress, request }: { clientAddress: string; request: Request }) {
  const ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip) return json({ ok: false }, 400);

  let ipHash: string;
  try {
    ipHash = hashIp(ip);
  } catch {
    return json({ ok: false }, 500);
  }
  const supabase = createServerClient();

  const { error } = await supabase
    .from('page_views')
    .upsert({ ip_hash: ipHash, page_path: '/' }, { onConflict: 'ip_hash,page_path', ignoreDuplicates: true });

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
