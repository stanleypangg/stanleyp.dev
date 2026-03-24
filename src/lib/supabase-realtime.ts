import { RealtimeClient } from '@supabase/realtime-js';
import type { RealtimeChannel } from '@supabase/realtime-js';

export type { RealtimeChannel };

export function createRealtimeClient(): RealtimeClient {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('Missing PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing PUBLIC_SUPABASE_ANON_KEY');
  return new RealtimeClient(`${url.replace('https://', 'wss://')}/realtime/v1`, {
    params: { apikey: key },
  });
}
