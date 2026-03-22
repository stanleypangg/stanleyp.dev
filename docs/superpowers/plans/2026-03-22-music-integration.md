# Music Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live `/music` page showing Last.fm top artists (with Spotify photos), top albums, recent tracks, and a time period toggle — plus a `music →` link on the home page.

**Architecture:** Astro 5 static site with one new server endpoint (`/api/spotify-token`) that proxies Spotify Client Credentials auth server-side. The `/music` page is a prerendered shell; all data is fetched client-side via two typed lib modules (`lastfm.ts`, `spotify.ts`). No new npm packages.

**Tech Stack:** Astro 5, `@astrojs/vercel` (already installed), Last.fm REST API, Spotify Web API, Vitest (added for testing), native `fetch`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `astro.config.mjs` | Modify | Add explicit `output: 'static'` |
| `.env` | Modify | Add `PUBLIC_LASTFM_API_KEY`, `PUBLIC_LASTFM_USERNAME` |
| `src/lib/lastfm.ts` | Create | Typed fetch wrappers for Last.fm user endpoints |
| `src/lib/spotify.ts` | Create | Artist image lookup via Spotify search |
| `src/pages/api/spotify-token.ts` | Create | Server endpoint: exchanges client credentials for Spotify token |
| `src/pages/music.astro` | Create | Static page shell + inline client `<script>` |
| `src/layouts/Layout.astro` | Modify | Add `music` nav link with `aria-current` support |
| `src/pages/index.astro` | Modify | Add `music →` link to Listening section |
| `vitest.config.ts` | Create | Vitest configuration for unit tests |
| `src/lib/lastfm.test.ts` | Create | Unit tests for Last.fm helpers |
| `src/lib/spotify.test.ts` | Create | Unit tests for Spotify image helper |
| `src/pages/api/spotify-token.test.ts` | Create | Unit tests for token endpoint |

---

## Task 1: Test infrastructure + environment setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `.env`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Note: Vitest shims `import.meta.env` as `{}` in node environment.
    // spotify-token.ts references import.meta.env inside GET() but tests
    // call getSpotifyClientToken() directly (which takes args), so no
    // additional env configuration is needed.
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify Vitest runs**

```bash
pnpm test
```

Expected: `No test files found` (passes with 0 tests — confirms setup works)

- [ ] **Step 5: Add env vars to `.env`**

Replace `your_lastfm_api_key_here` and `your_lastfm_username_here` with real values **before** running `pnpm dev`. If you leave placeholders, Last.fm API calls will silently fail and the music page will show only "unavailable" sections with no clear error.

```bash
# .env — add these two lines (use real values)
PUBLIC_LASTFM_API_KEY=abc123yourkeyhere
PUBLIC_LASTFM_USERNAME=yourlastfmusername
```

Get your Last.fm API key at https://www.last.fm/api/account/create (free, instant).

- [ ] **Step 6: Add `output: 'static'` to `astro.config.mjs`**

Change from:
```js
export default defineConfig({
  site: 'https://example.com',
  adapter: vercel(),
});
```

To:
```js
export default defineConfig({
  output: 'static',
  site: 'https://example.com',
  adapter: vercel(),
});
```

- [ ] **Step 7: Verify dev server still starts**

```bash
pnpm dev
```

Expected: server starts, home page loads at `http://localhost:4321`

- [ ] **Step 8: Commit**

Note: `.env` must **not** be committed — it contains secrets. Confirm it is in `.gitignore` before proceeding. Only commit the config files:

```bash
git add vitest.config.ts package.json astro.config.mjs
git commit -m "chore: add vitest, set output:static"
```

---

## Task 2: `src/lib/lastfm.ts` — Last.fm API helpers

**Files:**
- Create: `src/lib/lastfm.ts`
- Create: `src/lib/lastfm.test.ts`

### Types

```ts
export type Period = '7day' | '1month' | 'overall';

export interface ArtistStat {
  name: string;
  playcount: number;
  url: string;
}

export interface AlbumStat {
  name: string;
  artist: string;
  playcount: number;
  url: string;
  imageUrl: string | null;  // Last.fm album art URL (medium size)
}

export interface Track {
  name: string;
  artist: string;
  url: string;
  timestamp: number | null;  // Unix timestamp, null if currently playing
}

export interface UserInfo {
  name: string;
  playcount: number;
}
```

- [ ] **Step 1: Write failing tests**

Create `src/lib/lastfm.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// lastfm.ts receives apiKey and user as function arguments,
// so no import.meta.env stubbing is needed here.
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// We import after stubbing so import.meta.env is defined
const API_KEY = 'test_key';
const USERNAME = 'test_user';
const BASE = 'https://ws.audioscrobbler.com/2.0/';

describe('getTopArtists', () => {
  it('returns parsed artist stats', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topartists: {
          artist: [
            { name: 'Radiohead', playcount: '42', url: 'https://last.fm/Radiohead' },
          ],
        },
      }),
    });

    const { getTopArtists } = await import('./lastfm');
    const result = await getTopArtists('7day', 10, API_KEY, USERNAME);

    expect(result).toEqual([
      { name: 'Radiohead', playcount: 42, url: 'https://last.fm/Radiohead' },
    ]);

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get('method')).toBe('user.gettopartists');
    expect(url.searchParams.get('period')).toBe('7day');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('user')).toBe(USERNAME);
    expect(url.searchParams.get('api_key')).toBe(API_KEY);
    expect(url.searchParams.get('format')).toBe('json');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const { getTopArtists } = await import('./lastfm');
    await expect(getTopArtists('7day', 10, API_KEY, USERNAME)).rejects.toThrow();
  });
});

describe('getTopAlbums', () => {
  it('returns parsed album stats with image', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topalbums: {
          album: [
            {
              name: 'OK Computer',
              artist: { name: 'Radiohead' },
              playcount: '20',
              url: 'https://last.fm/okcomputer',
              image: [
                { '#text': '', size: 'small' },
                { '#text': 'https://img/medium.jpg', size: 'medium' },
                { '#text': 'https://img/large.jpg', size: 'large' },
              ],
            },
          ],
        },
      }),
    });

    const { getTopAlbums } = await import('./lastfm');
    const result = await getTopAlbums('7day', 10, API_KEY, USERNAME);

    expect(result[0]).toMatchObject({
      name: 'OK Computer',
      artist: 'Radiohead',
      playcount: 20,
      imageUrl: 'https://img/medium.jpg',
    });
  });

  it('sets imageUrl to null when image text is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topalbums: {
          album: [
            {
              name: 'Album',
              artist: { name: 'Artist' },
              playcount: '1',
              url: 'https://last.fm/album',
              image: [{ '#text': '', size: 'medium' }],
            },
          ],
        },
      }),
    });

    const { getTopAlbums } = await import('./lastfm');
    const result = await getTopAlbums('7day', 10, API_KEY, USERNAME);
    expect(result[0].imageUrl).toBeNull();
  });
});

describe('getRecentTracks', () => {
  it('returns parsed tracks with timestamp', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Karma Police',
              artist: { '#text': 'Radiohead' },
              url: 'https://last.fm/karmapolice',
              date: { uts: '1700000000' },
            },
          ],
        },
      }),
    });

    const { getRecentTracks } = await import('./lastfm');
    const result = await getRecentTracks(10, API_KEY, USERNAME);

    expect(result[0]).toEqual({
      name: 'Karma Police',
      artist: 'Radiohead',
      url: 'https://last.fm/karmapolice',
      timestamp: 1700000000,
    });
  });

  it('sets timestamp to null for now-playing track', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Track',
              artist: { '#text': 'Artist' },
              url: 'https://last.fm/track',
              '@attr': { nowplaying: 'true' },
              // no date field
            },
          ],
        },
      }),
    });

    const { getRecentTracks } = await import('./lastfm');
    const result = await getRecentTracks(10, API_KEY, USERNAME);
    expect(result[0].timestamp).toBeNull();
  });
});

describe('getUserInfo', () => {
  it('returns playcount as number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { name: 'testuser', playcount: '12345' },
      }),
    });

    const { getUserInfo } = await import('./lastfm');
    const result = await getUserInfo(API_KEY, USERNAME);
    expect(result).toEqual({ name: 'testuser', playcount: 12345 });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm test src/lib/lastfm.test.ts
```

Expected: FAIL — `Cannot find module './lastfm'`

- [ ] **Step 3: Implement `src/lib/lastfm.ts`**

```ts
export type Period = '7day' | '1month' | 'overall';

export interface ArtistStat {
  name: string;
  playcount: number;
  url: string;
}

export interface AlbumStat {
  name: string;
  artist: string;
  playcount: number;
  url: string;
  imageUrl: string | null;
}

export interface Track {
  name: string;
  artist: string;
  url: string;
  timestamp: number | null;
}

export interface UserInfo {
  name: string;
  playcount: number;
}

const BASE = 'https://ws.audioscrobbler.com/2.0/';

function buildUrl(params: Record<string, string>): string {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('format', 'json');
  return url.toString();
}

async function get<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(buildUrl(params));
  if (!res.ok) throw new Error(`Last.fm ${params.method} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getTopArtists(
  period: Period,
  limit: number,
  apiKey: string,
  user: string,
): Promise<ArtistStat[]> {
  const data = await get<{ topartists: { artist: Array<{ name: string; playcount: string; url: string }> } }>({
    method: 'user.gettopartists',
    user,
    api_key: apiKey,
    period,
    limit: String(limit),
  });
  return data.topartists.artist.map((a) => ({
    name: a.name,
    playcount: Number(a.playcount),
    url: a.url,
  }));
}

export async function getTopAlbums(
  period: Period,
  limit: number,
  apiKey: string,
  user: string,
): Promise<AlbumStat[]> {
  const data = await get<{
    topalbums: {
      album: Array<{
        name: string;
        artist: { name: string };
        playcount: string;
        url: string;
        image: Array<{ '#text': string; size: string }>;
      }>;
    };
  }>({
    method: 'user.gettopalbums',
    user,
    api_key: apiKey,
    period,
    limit: String(limit),
  });
  return data.topalbums.album.map((a) => {
    const medium = a.image.find((i) => i.size === 'medium');
    const imageUrl = medium?.['#text'] || null;
    return {
      name: a.name,
      artist: a.artist.name,
      playcount: Number(a.playcount),
      url: a.url,
      imageUrl: imageUrl || null,
    };
  });
}

export async function getRecentTracks(
  limit: number,
  apiKey: string,
  user: string,
): Promise<Track[]> {
  const data = await get<{
    recenttracks: {
      track: Array<{
        name: string;
        artist: { '#text': string };
        url: string;
        date?: { uts: string };
        '@attr'?: { nowplaying: string };
      }>;
    };
  }>({
    method: 'user.getrecenttracks',
    user,
    api_key: apiKey,
    limit: String(limit),
  });
  return data.recenttracks.track.map((t) => ({
    name: t.name,
    artist: t.artist['#text'],
    url: t.url,
    timestamp: t.date ? Number(t.date.uts) : null,
  }));
}

export async function getUserInfo(apiKey: string, user: string): Promise<UserInfo> {
  const data = await get<{ user: { name: string; playcount: string } }>({
    method: 'user.getinfo',
    user,
    api_key: apiKey,
  });
  return {
    name: data.user.name,
    playcount: Number(data.user.playcount),
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm test src/lib/lastfm.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/lastfm.ts src/lib/lastfm.test.ts
git commit -m "feat: add Last.fm API helpers with tests"
```

---

## Task 3: `/api/spotify-token.ts` — server endpoint

**Files:**
- Create: `src/pages/api/spotify-token.ts`
- Create: `src/pages/api/spotify-token.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/pages/api/spotify-token.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test `getSpotifyClientToken` directly — it accepts credentials as
// arguments, so no import.meta.env stubbing is needed.
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

describe('getSpotifyClientToken', () => {
  it('returns access token from Spotify', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok_abc', expires_in: 3600 }),
    });

    const { getSpotifyClientToken } = await import('./spotify-token');
    const res = await getSpotifyClientToken('cid', 'csec');
    const body = await res.json();

    expect(body).toEqual({ access_token: 'tok_abc', expires_in: 3600 });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3500');

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('https://accounts.spotify.com/api/token');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers.Authorization).toBe(`Basic ${btoa('cid:csec')}`);
  });

  it('returns 500 when credentials are missing', async () => {
    const { getSpotifyClientToken } = await import('./spotify-token');
    const res = await getSpotifyClientToken('', '');
    expect(res.status).toBe(500);
  });

  it('returns 502 when Spotify responds with an error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    const { getSpotifyClientToken } = await import('./spotify-token');
    const res = await getSpotifyClientToken('cid', 'csec');
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm test src/pages/api/spotify-token.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/pages/api/spotify-token.ts`**

The core logic is extracted into `getSpotifyClientToken` so it can be unit-tested without `import.meta.env`. The Astro `GET` handler simply passes the env vars to it.

```ts
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm test src/pages/api/spotify-token.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/spotify-token.ts src/pages/api/spotify-token.test.ts
git commit -m "feat: add spotify-token server endpoint with tests"
```

---

## Task 4: `src/lib/spotify.ts` — artist image lookup

**Files:**
- Create: `src/lib/spotify.ts`
- Create: `src/lib/spotify.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/spotify.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

describe('getArtistImage', () => {
  it('returns the smallest image at or above 300px width', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: {
          items: [{
            name: 'Radiohead',
            images: [
              { url: 'https://img/640.jpg', width: 640, height: 640 },
              { url: 'https://img/300.jpg', width: 300, height: 300 },
              { url: 'https://img/64.jpg',  width: 64,  height: 64  },
            ],
          }],
        },
      }),
    });

    const { getArtistImage } = await import('./spotify');
    const result = await getArtistImage('Radiohead', 'tok');
    expect(result).toBe('https://img/300.jpg');
  });

  it('falls back to the largest available image when none is >= 300px', async () => {
    // sorted ascending: [50, 100] → none >= 300 → fallback = last = 100px
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: {
          items: [{
            name: 'Tiny',
            images: [
              { url: 'https://img/100.jpg', width: 100, height: 100 },
              { url: 'https://img/50.jpg',  width: 50,  height: 50  },
            ],
          }],
        },
      }),
    });

    const { getArtistImage } = await import('./spotify');
    const result = await getArtistImage('Tiny', 'tok');
    // sorted ascending: [50px, 100px]; last entry = 100px (largest available)
    expect(result).toBe('https://img/100.jpg');
  });

  it('handles null width entries by treating them as 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: {
          items: [{
            name: 'Artist',
            images: [
              { url: 'https://img/a.jpg', width: null, height: null },
              { url: 'https://img/b.jpg', width: 300,  height: 300  },
            ],
          }],
        },
      }),
    });

    const { getArtistImage } = await import('./spotify');
    const result = await getArtistImage('Artist', 'tok');
    expect(result).toBe('https://img/b.jpg');
  });

  it('returns null when artist not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    });
    const { getArtistImage } = await import('./spotify');
    expect(await getArtistImage('Ghost', 'tok')).toBeNull();
  });

  it('returns null on HTTP 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    const { getArtistImage } = await import('./spotify');
    expect(await getArtistImage('X', 'tok')).toBeNull();
  });

  it('returns null when images array is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: { items: [{ name: 'Y', images: [] }] },
      }),
    });
    const { getArtistImage } = await import('./spotify');
    expect(await getArtistImage('Y', 'tok')).toBeNull();
  });

  it('URL-encodes the artist name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    });
    const { getArtistImage } = await import('./spotify');
    await getArtistImage('AC/DC', 'tok');
    const called = mockFetch.mock.calls[0][0] as string;
    expect(called).toContain('AC%2FDC');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm test src/lib/spotify.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/spotify.ts`**

```ts
interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export async function getArtistImage(
  artistName: string,
  accessToken: string,
): Promise<string | null> {
  const encoded = encodeURIComponent(artistName);
  const url = `https://api.spotify.com/v1/search?q=${encoded}&type=artist&limit=1`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data = await res.json();
  const items: Array<{ images: SpotifyImage[] }> = data?.artists?.items ?? [];
  if (items.length === 0) return null;

  const images = items[0].images;
  if (images.length === 0) return null;

  // Sort ascending by width (null treated as 0)
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));

  // Find the smallest image at or above 300px
  const target = sorted.find((img) => (img.width ?? 0) >= 300);

  // Fall back to the last (smallest available) if none qualifies
  return (target ?? sorted[sorted.length - 1]).url;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm test src/lib/spotify.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Run the full test suite**

```bash
pnpm test
```

Expected: all tests PASS across all three test files

- [ ] **Step 6: Commit**

```bash
git add src/lib/spotify.ts src/lib/spotify.test.ts
git commit -m "feat: add Spotify artist image helper with tests"
```

---

## Task 5: Nav and home page updates

**Files:**
- Modify: `src/layouts/Layout.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add `music` nav link to `Layout.astro`**

In the frontmatter, add after `const isWriting = pathname.startsWith('/writing')`:
```ts
const isMusic = pathname.startsWith('/music');
```

In the `<ul class="nav-links">`, add a new `<li>` after the `writing` link:
```astro
<li>
  <a
    href="/music"
    class="nav-link"
    aria-current={isMusic ? 'page' : undefined}
  >music</a>
</li>
```

- [ ] **Step 2: Verify nav in browser**

```bash
pnpm dev
```

Open `http://localhost:4321`. Confirm `music` appears in the nav. Click it — expect a 404 (page not built yet). Navigate to `/work` — confirm `work` is highlighted and `music` is not.

- [ ] **Step 3: Add `music →` link to home page Listening section**

In `src/pages/index.astro`, find this exact block:

```astro
<!-- before -->
<section>
  <span class="label">Listening</span>
  <NowPlaying />
</section>
```

Change to:

```astro
<!-- after -->
<section>
  <span class="label">Listening</span>
  <NowPlaying />
  <a href="/music" class="link" style="margin-top: 0.5rem;">music →</a>
</section>
```

- [ ] **Step 4: Verify link in browser**

Open `http://localhost:4321`. Confirm the `music →` link appears below the NowPlaying widget in the Listening section.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Layout.astro src/pages/index.astro
git commit -m "feat: add music nav link and home page teaser link"
```

---

## Task 6: `/music` page — static shell + client data loading

**Files:**
- Create: `src/pages/music.astro`

This is the largest task. The page is a static Astro shell. All data fetching is done by a single inline `<script>` that imports `lastfm.ts` and `spotify.ts`.

- [ ] **Step 1: Create the page shell with skeleton states**

Create `src/pages/music.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Listening — [Your Name]" description="Music I've been listening to.">
  <header>
    <span class="label">Listening</span>
    <p class="scrobble-count" id="scrobble-count">—</p>
  </header>

  <hr class="rule" />

  <!-- Period toggle -->
  <div class="toggle" role="group" aria-label="Time period">
    <button class="toggle-btn active" data-period="7day">7 days</button>
    <button class="toggle-btn" data-period="1month">1 month</button>
    <button class="toggle-btn" data-period="overall">all time</button>
  </div>

  <hr class="rule" />

  <!-- Top Artists -->
  <section id="section-artists">
    <span class="label">Top artists</span>
    <div class="grid skeleton-grid" id="artists-grid">
      {Array.from({ length: 10 }).map(() => (
        <div class="grid-item skeleton" />
      ))}
    </div>
  </section>

  <hr class="rule" />

  <!-- Top Albums -->
  <section id="section-albums">
    <span class="label">Top albums</span>
    <div class="grid skeleton-grid" id="albums-grid">
      {Array.from({ length: 10 }).map(() => (
        <div class="grid-item skeleton" />
      ))}
    </div>
  </section>

  <hr class="rule" />

  <!-- Recent Tracks -->
  <section id="section-tracks">
    <span class="label">Recent tracks</span>
    <div class="track-list" id="track-list">
      {Array.from({ length: 10 }).map(() => (
        <div class="entry skeleton-row" />
      ))}
    </div>
  </section>
</Layout>

<style>
  .scrobble-count {
    font-size: var(--text-sm);
    color: var(--muted);
    margin-top: 0.25rem;
  }

  /* Period toggle */
  .toggle {
    display: flex;
    gap: 1.5rem;
  }

  .toggle-btn {
    font-family: var(--font-text);
    font-size: var(--text-xs);
    letter-spacing: 0.05em;
    text-transform: lowercase;
    color: var(--muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 250ms, padding-left 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toggle-btn:hover,
  .toggle-btn.active {
    color: var(--fg);
    padding-left: 0.4rem;
  }

  /* Grid (artists + albums) */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 1rem 1.25rem;
  }

  .grid-item {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .grid-item img,
  .grid-item .img-placeholder {
    width: 80px;
    height: 80px;
    object-fit: cover;
    display: block;
  }

  .img-placeholder {
    background: var(--subtle);
  }

  .grid-item .item-name {
    font-size: var(--text-xs);
    color: var(--fg);
    line-height: 1.3;
  }

  .grid-item .item-meta {
    font-size: var(--text-2xs);
    color: var(--muted);
  }

  /* Track list */
  .track-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Skeleton */
  .skeleton {
    width: 80px;
    height: 80px;
    background: var(--subtle);
  }

  .skeleton-row {
    height: 1.2rem;
    background: var(--subtle);
    border-radius: 2px;
  }

  /* Error state */
  .unavailable {
    font-size: var(--text-sm);
    color: var(--muted);
  }
</style>
```

- [ ] **Step 2: Verify the shell renders**

```bash
pnpm dev
```

Navigate to `http://localhost:4321/music`. Confirm the page loads with skeleton placeholders, a toggle row, and section labels. No data yet — that's fine.

- [ ] **Step 3: Add the client data-loading script**

Add this `<script>` block at the bottom of `music.astro`, before the closing `</Layout>`:

```astro
<script>
  import { getTopArtists, getTopAlbums, getRecentTracks, getUserInfo } from '../lib/lastfm';
  import type { Period, ArtistStat, AlbumStat, Track } from '../lib/lastfm';
  import { getArtistImage } from '../lib/spotify';

  const API_KEY = import.meta.env.PUBLIC_LASTFM_API_KEY;
  const USERNAME = import.meta.env.PUBLIC_LASTFM_USERNAME;

  // ── Spotify token (cached per session) ───────────────────────────────────
  interface TokenCache { token: string; expiresAt: number }

  async function getSpotifyToken(): Promise<string | null> {
    try {
      const cached = sessionStorage.getItem('sp_token');
      if (cached) {
        const { token, expiresAt }: TokenCache = JSON.parse(cached);
        if (Date.now() < expiresAt) return token;
      }
      const res = await fetch('/api/spotify-token');
      if (!res.ok) return null;
      const { access_token, expires_in } = await res.json();
      sessionStorage.setItem('sp_token', JSON.stringify({
        token: access_token,
        expiresAt: Date.now() + expires_in * 1000 - 60_000, // 1-min buffer
      }));
      return access_token;
    } catch {
      return null;
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  function formatPlaycount(n: number): string {
    return n.toLocaleString() + ' plays';
  }

  function formatTimestamp(ts: number | null): string {
    if (!ts) return 'now playing';
    const d = new Date(ts * 1000);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function renderArtists(artists: ArtistStat[], images: Map<string, string | null>) {
    const grid = document.getElementById('artists-grid')!;
    grid.innerHTML = artists.map((a) => {
      const imgUrl = images.get(a.name);
      const imgEl = imgUrl
        ? `<img src="${imgUrl}" alt="${a.name}" width="80" height="80" loading="lazy" />`
        : `<div class="img-placeholder" aria-hidden="true"></div>`;
      return `
        <div class="grid-item">
          <a href="${a.url}" target="_blank" rel="noopener noreferrer">${imgEl}</a>
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${formatPlaycount(a.playcount)}</span>
        </div>`;
    }).join('');
    grid.classList.remove('skeleton-grid');
  }

  function renderAlbums(albums: AlbumStat[]) {
    const grid = document.getElementById('albums-grid')!;
    grid.innerHTML = albums.map((a) => {
      const imgEl = a.imageUrl
        ? `<img src="${a.imageUrl}" alt="${a.name}" width="80" height="80" loading="lazy" />`
        : `<div class="img-placeholder" aria-hidden="true"></div>`;
      return `
        <div class="grid-item">
          <a href="${a.url}" target="_blank" rel="noopener noreferrer">${imgEl}</a>
          <span class="item-name">${a.name}</span>
          <span class="item-meta">${a.artist} · ${formatPlaycount(a.playcount)}</span>
        </div>`;
    }).join('');
    grid.classList.remove('skeleton-grid');
  }

  function renderTracks(tracks: Track[]) {
    const list = document.getElementById('track-list')!;
    list.innerHTML = tracks.map((t) => `
      <div class="entry">
        <span class="entry-title">
          <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="link">${t.name}</a>
          <span class="entry-sub">${t.artist}</span>
        </span>
        <span class="entry-meta">${formatTimestamp(t.timestamp)}</span>
      </div>`).join('');
  }

  function showError(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const content = el.querySelector('[id$="-grid"], [id$="-list"]');
    if (content) content.innerHTML = '<p class="unavailable">unavailable</p>';
  }

  // ── Main load ─────────────────────────────────────────────────────────────
  let currentPeriod: Period = '7day';

  async function loadPeriodData(period: Period) {
    // Fetch period-dependent data in parallel
    const [artistsResult, albumsResult] = await Promise.allSettled([
      getTopArtists(period, 10, API_KEY, USERNAME),
      getTopAlbums(period, 10, API_KEY, USERNAME),
    ]);

    // Artists
    if (artistsResult.status === 'fulfilled') {
      const artists = artistsResult.value;
      const token = await getSpotifyToken();
      const imageEntries = await Promise.all(
        artists.map(async (a) => {
          const img = token ? await getArtistImage(a.name, token) : null;
          return [a.name, img] as [string, string | null];
        })
      );
      renderArtists(artists, new Map(imageEntries));
    } else {
      showError('section-artists');
    }

    // Albums
    if (albumsResult.status === 'fulfilled') {
      renderAlbums(albumsResult.value);
    } else {
      showError('section-albums');
    }
  }

  async function loadStaticData() {
    // Fetch period-independent data in parallel
    const [tracksResult, userResult] = await Promise.allSettled([
      getRecentTracks(10, API_KEY, USERNAME),
      getUserInfo(API_KEY, USERNAME),
    ]);

    if (tracksResult.status === 'fulfilled') {
      renderTracks(tracksResult.value);
    } else {
      showError('section-tracks');
    }

    if (userResult.status === 'fulfilled') {
      const el = document.getElementById('scrobble-count');
      if (el) el.textContent = `${userResult.value.playcount.toLocaleString()} scrobbles`;
    }
  }

  // ── Toggle ────────────────────────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const period = btn.dataset.period as Period;
      if (period === currentPeriod) return;
      currentPeriod = period;

      // Update active state
      document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Re-render skeletons for period-dependent sections only
      const artistsGrid = document.getElementById('artists-grid')!;
      const albumsGrid = document.getElementById('albums-grid')!;
      artistsGrid.innerHTML = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');
      albumsGrid.innerHTML  = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');

      await loadPeriodData(period);
    });
  });

  // ── Initial load ──────────────────────────────────────────────────────────
  await Promise.allSettled([
    loadPeriodData(currentPeriod),
    loadStaticData(),
  ]);
</script>
```

- [ ] **Step 4: Smoke test in browser**

```bash
pnpm dev
```

Navigate to `http://localhost:4321/music`. Confirm:
- Skeletons briefly appear then data populates
- Top artists show with (or without) photos
- Top albums show with cover art
- Recent tracks show with timestamps
- Scrobble count appears in the header
- Toggle buttons switch between 7 days / 1 month / all time and reload artist/album data
- Nav `music` link is highlighted on this page

- [ ] **Step 5: Commit**

```bash
git add src/pages/music.astro
git commit -m "feat: add /music page with live Last.fm data and period toggle"
```

---

## Task 7: Production build verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests PASS

- [ ] **Step 2: Build the site**

```bash
pnpm build
```

Expected: build completes. Watch for any TypeScript errors or missing env var warnings.

- [ ] **Step 3: Preview the production build**

```bash
pnpm preview
```

Open `http://localhost:4321/music`. Verify it behaves identically to dev mode.

- [ ] **Step 4: Add Vercel env vars**

In the Vercel project dashboard (Settings → Environment Variables), add:
- `PUBLIC_LASTFM_API_KEY` — your Last.fm API key
- `PUBLIC_LASTFM_USERNAME` — your Last.fm username

Existing `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` should already be there from the NowPlaying setup.

- [ ] **Step 5: Final commit**

Run `git status` first to confirm nothing unexpected is staged (especially `.env`). Then:

```bash
git add src/pages/music.astro src/layouts/Layout.astro src/pages/index.astro \
        src/lib/lastfm.ts src/lib/spotify.ts \
        src/pages/api/spotify-token.ts \
        src/lib/lastfm.test.ts src/lib/spotify.test.ts \
        src/pages/api/spotify-token.test.ts \
        astro.config.mjs vitest.config.ts package.json
git commit -m "chore: music integration complete"
```
