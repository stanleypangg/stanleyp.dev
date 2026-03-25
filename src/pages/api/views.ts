export const prerender = false;

import { hashIp } from '../../lib/hash-ip';
import { createServerClient } from '../../lib/supabase';

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|preview|headless|phantom|selenium|puppeteer/i;

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

export async function POST({
  request,
  clientAddress,
}: {
  request: Request;
  clientAddress: string;
}) {
  const origin = request.headers.get('origin');
  if (origin && origin !== 'https://stanleyp.dev') {
    return json({ ok: false }, 403);
  }

  const ua = request.headers.get('user-agent') ?? '';
  if (BOT_RE.test(ua)) {
    return json({ ok: true });
  }

  const ip = clientAddress;
  if (!ip) {
    return json({ ok: false, error: 'Unable to determine client IP' }, 400);
  }

  let visitorId: string;
  try {
    visitorId = hashIp(ip);
  } catch {
    return json({ ok: false }, 500);
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('page_views')
    .upsert(
      { visitor_id: visitorId, page_path: '/' },
      { onConflict: 'visitor_id,page_path', ignoreDuplicates: true },
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
