export const prerender = false;

// Extracted for unit-testability: accepts credentials as arguments.
export async function getSpotifyClientToken(
  clientId: string,
  clientSecret: string,
): Promise<Response> {
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Spotify credentials not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Spotify token request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await res.json();

  return new Response(
    JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3500, stale-while-revalidate=100',
      },
    },
  );
}

export async function GET() {
  return getSpotifyClientToken(
    import.meta.env.SPOTIFY_CLIENT_ID,
    import.meta.env.SPOTIFY_CLIENT_SECRET,
  );
}
