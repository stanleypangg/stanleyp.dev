export const prerender = false;

const TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Extracted for unit-testability: accepts credentials as arguments.
export async function getSpotifyClientToken(
  clientId: string,
  clientSecret: string,
): Promise<Response> {
  if (!clientId || !clientSecret) {
    return json({ error: 'Spotify credentials not configured' }, 500);
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) {
    return json({ error: 'Spotify token request failed' }, 502);
  }

  const data = await res.json();

  return json(
    { access_token: data.access_token, expires_in: data.expires_in },
    200,
    { 'Cache-Control': 's-maxage=3500, stale-while-revalidate=100' },
  );
}

export async function GET() {
  return getSpotifyClientToken(
    import.meta.env.SPOTIFY_CLIENT_ID,
    import.meta.env.SPOTIFY_CLIENT_SECRET,
  );
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
