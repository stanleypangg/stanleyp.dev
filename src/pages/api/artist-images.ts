export const prerender = false;

import { getArtistImage } from '../../lib/spotify';

async function getClientToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.access_token as string) ?? null;
  } catch {
    return null;
  }
}

export async function GET({ url }: { url: URL }) {
  const names = url.searchParams.getAll('names').filter(Boolean);

  if (names.length === 0) {
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }

  const token = await getClientToken(
    import.meta.env.SPOTIFY_CLIENT_ID,
    import.meta.env.SPOTIFY_CLIENT_SECRET,
  );

  if (!token) {
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }

  const entries = await Promise.all(
    names.map(async (name) => [name, await getArtistImage(name, token)] as [string, string | null]),
  );

  return new Response(JSON.stringify(Object.fromEntries(entries)), {
    headers: {
      'Content-Type': 'application/json',
      // Cache at CDN for 1 hour; serve stale up to 2 hours while revalidating
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
