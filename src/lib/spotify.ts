// ── Token cache ───────────────────────────────────────────────────────────────
// Client credentials tokens last 3600s. Cache them in module scope so warm
// Vercel instances reuse the same token instead of hitting the token endpoint
// on every /api/artist-images request. Mirrors the pattern in now-playing.ts.
let cachedClientToken: string | null = null;
let clientTokenExpiresAt = 0;

export async function getClientToken(
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  if (cachedClientToken && Date.now() < clientTokenExpiresAt) return cachedClientToken;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = (data.access_token as string) ?? null;
    if (token) {
      cachedClientToken = token;
      // Refresh 60s before expiry to avoid using an expired token
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      clientTokenExpiresAt = Date.now() + expiresIn * 1000 - 60_000;
    }
    return token;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ArtistData {
  imageUrl: string | null;
  spotifyUrl: string | null;
}

// ── Artist result cache ───────────────────────────────────────────────────────
// Artist images change rarely (months/years). Cache results in module scope so
// the same artist isn't re-fetched across different time periods or CDN misses.
const ARTIST_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ARTIST_CACHE = 500;
const artistCache = new Map<string, { data: ArtistData; ts: number }>();

export async function getArtistData(
  artistName: string,
  accessToken: string,
): Promise<ArtistData> {
  const key = artistName.toLowerCase().trim();
  const cached = artistCache.get(key);
  if (cached && Date.now() - cached.ts < ARTIST_CACHE_TTL) return cached.data;

  const encoded = encodeURIComponent(artistName);
  const url = `https://api.spotify.com/v1/search?q=${encoded}&type=artist&limit=1`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!res.ok) return { imageUrl: null, spotifyUrl: null };

    const data = await res.json();
    const items: Array<{ images: SpotifyImage[]; external_urls: { spotify: string } }> =
      data?.artists?.items ?? [];
    if (items.length === 0) {
      artistCache.set(key, { data: { imageUrl: null, spotifyUrl: null }, ts: Date.now() });
      return { imageUrl: null, spotifyUrl: null };
    }

    const images = items[0].images;
    const spotifyUrl = items[0].external_urls?.spotify ?? null;

    let result: ArtistData;
    if (images.length === 0) {
      result = { imageUrl: null, spotifyUrl };
    } else {
      const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
      const target = sorted.find((img) => (img.width ?? 0) >= 300);
      result = { imageUrl: (target ?? sorted[sorted.length - 1]).url, spotifyUrl };
    }

    // Evict oldest entries if at capacity
    if (artistCache.size >= MAX_ARTIST_CACHE) {
      const entries = [...artistCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 100; i++) artistCache.delete(entries[i][0]);
    }
    artistCache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch {
    return { imageUrl: null, spotifyUrl: null };
  } finally {
    clearTimeout(id);
  }
}

// ── Test helper ───────────────────────────────────────────────────────────────
// Exported for test isolation only. Not intended for production use.
export function _resetCaches(): void {
  cachedClientToken = null;
  clientTokenExpiresAt = 0;
  artistCache.clear();
}
