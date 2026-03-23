export const prerender = false;

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

async function getAccessToken(): Promise<string> {
  const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = import.meta.env.SPOTIFY_REFRESH_TOKEN;

  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  return data.access_token;
}

export async function GET() {
  const missingVars =
    !import.meta.env.SPOTIFY_CLIENT_ID ||
    !import.meta.env.SPOTIFY_CLIENT_SECRET ||
    !import.meta.env.SPOTIFY_REFRESH_TOKEN;

  if (missingVars) {
    return new Response(JSON.stringify({ error: 'Spotify credentials not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const accessToken = await getAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}` };

  const nowRes = await fetch(NOW_PLAYING_URL, { headers });

  if (nowRes.status === 200) {
    const data = await nowRes.json();
    if (data?.item) {
      return json({
        isPlaying: data.is_playing,
        title: data.item.name,
        artist: data.item.artists.map((a: { name: string }) => a.name).join(', '),
        albumImageUrl: data.item.album.images[1]?.url ?? data.item.album.images[0]?.url,
        songUrl: data.item.external_urls.spotify,
      });
    }
  }

  // Fallback: recently played
  const recentRes = await fetch(RECENTLY_PLAYED_URL, { headers });
  if (recentRes.status === 200) {
    const data = await recentRes.json();
    const track = data?.items?.[0]?.track;
    if (track) {
      return json({
        isPlaying: false,
        title: track.name,
        artist: track.artists.map((a: { name: string }) => a.name).join(', '),
        albumImageUrl: track.album.images[1]?.url ?? track.album.images[0]?.url,
        songUrl: track.external_urls.spotify,
      });
    }
  }

  return json({ isPlaying: false, title: null });
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
