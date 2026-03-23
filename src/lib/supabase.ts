import { createClient } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  display_name: string;
  content: string;
  created_at: string;
}

export function createBrowserClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('Missing PUBLIC_SUPABASE_URL environment variable');
  if (!key) throw new Error('Missing PUBLIC_SUPABASE_ANON_KEY environment variable');
  return createClient(url, key);
}

export function createServerClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Missing PUBLIC_SUPABASE_URL environment variable');
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  return createClient(url, key);
}
