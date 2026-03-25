export const prerender = false;

import { getArtistData, getClientToken } from '../../lib/spotify';

export async function GET({ url }: { url: URL }) {
  const names = url.searchParams.getAll('names').filter(Boolean);

  if (names.length === 0) {
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }

  if (names.length > 50) {
    return new Response(JSON.stringify({ error: 'Too many names (max 50)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (names.some(n => n.length > 200)) {
    return new Response(JSON.stringify({ error: 'Artist name too long (max 200 chars)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await getClientToken(
    import.meta.env.SPOTIFY_CLIENT_ID,
    import.meta.env.SPOTIFY_CLIENT_SECRET,
  );

  if (!token) {
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }

  const entries = await Promise.all(
    names.map(async (name) => [name, await getArtistData(name, token)] as const),
  );

  return new Response(JSON.stringify(Object.fromEntries(entries)), {
    headers: {
      'Content-Type': 'application/json',
      // Cache at CDN for 1 hour; browser for 5 min; serve stale up to 2 hours while revalidating
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
