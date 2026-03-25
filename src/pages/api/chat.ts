export const prerender = false;

import { hashIp } from '../../lib/hash-ip';
import { createServerClient } from '../../lib/supabase';
import LeoProfanity from 'leo-profanity';

const blockedWords = (import.meta.env.BLOCKED_WORDS || '').split(',').map((w: string) => w.trim()).filter(Boolean);
if (blockedWords.length > 0) LeoProfanity.add(blockedWords);

const BLOCKED = (import.meta.env.BLOCKED_WORDS || '').split(',').map((w: string) => w.trim().toLowerCase()).filter(Boolean);
const CHAT_DISABLED = import.meta.env.CHAT_DISABLED === 'true';
const HOURLY_LIMIT = 20;

function containsBlocked(text: string): boolean {
  if (BLOCKED.length === 0) return false;
  const normalized = text.toLowerCase().replace(/[^a-z]/g, '');
  return BLOCKED.some((w: string) => normalized.includes(w));
}


export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, display_name, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return json({ error: 'Failed to load messages' }, 500);
  }
  return json((data ?? []).reverse());
}

export async function POST({ request, clientAddress }: { request: Request; clientAddress: string }) {
  if (CHAT_DISABLED) {
    return json({ error: 'Chat is temporarily disabled' }, 503);
  }

  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return json({ error: 'Invalid content type' }, 400);
  }

  let body: { display_name?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { display_name, content } = body;

  if (
    typeof display_name !== 'string' ||
    display_name.trim().length === 0 ||
    display_name.trim().length > 32
  ) {
    return json({ error: 'Display name must be 1–32 characters' }, 400);
  }

  if (
    typeof content !== 'string' ||
    content.trim().length === 0 ||
    content.trim().length > 500
  ) {
    return json({ error: 'Message must be 1–500 characters' }, 400);
  }

  const ip = clientAddress;
  if (!ip) {
    return json({ error: 'Unable to determine client IP' }, 400);
  }
  let ipHash: string;
  try {
    ipHash = hashIp(ip);
  } catch {
    return json({ error: 'Internal server error' }, 500);
  }

  const supabase = createServerClient();

  // Rate limit: cooldown between messages
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { data: recent } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('ip_hash', ipHash)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  if (recent && recent.length > 0) {
    const lastSent = new Date(recent[0].created_at).getTime();
    if (Date.now() - lastSent < 5_000) {
      return json({ error: 'Too fast. Wait a few seconds.' }, 429);
    }
    if (recent.length >= HOURLY_LIMIT) {
      return json({ error: 'Too many messages. Try again later.' }, 429);
    }
  }

  if (
    LeoProfanity.check(display_name.trim()) || LeoProfanity.check(content.trim()) ||
    containsBlocked(display_name.trim()) || containsBlocked(content.trim())
  ) {
    return json({ error: 'Message contains prohibited content' }, 400);
  }

  const { error } = await supabase.from('chat_messages').insert({
    display_name: display_name.trim(),
    content: content.trim(),
    ip_hash: ipHash,
  });

  if (error) {
    console.error('[chat] Insert failed:', error.message);
    return json({ error: 'Failed to send message' }, 500);
  }

  return json({ ok: true }, 201);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
