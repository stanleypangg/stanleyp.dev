# Music Integration Design

**Date:** 2026-03-22
**Status:** Approved
**Stack:** Astro 5, Vercel, Last.fm API, Spotify Web API

---

## Overview

Add a live music stats section to the portfolio. A full `/music` page displays top artists (with Spotify photos), top albums (with cover art), and recent tracks — fetched live from Last.fm on every visit. A time period toggle lets visitors switch between 7 days, 1 month, and all time. The existing "Listening" section on the home page gains a `music →` link to the new page; the `NowPlaying` widget is left untouched.

---

## Existing music infrastructure

The project already has:

- **`src/components/NowPlaying.astro`** — shows current/recently played track via Spotify OAuth
- **`src/pages/api/now-playing.ts`** — server endpoint using `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` (Authorization Code + refresh token, user-scoped)
- **`astro.config.mjs`** — already imports and registers `@astrojs/vercel` adapter; no `output` key (defaults to `'static'`)
- **`package.json`** — already has `"@astrojs/vercel": "^9.0.5"`
- **`index.astro`** — already has `<NowPlaying />` inside a "Listening" section

This integration does **not** modify or replace `NowPlaying.astro`, `/api/now-playing.ts`, or the existing "Listening" section markup beyond adding one link.

---

## Requirements

- Live data fetched client-side on every visit — the page shell is prerendered (static HTML), all API calls happen in the browser
- Top artists with real photos (via Spotify search)
- Top albums with cover art (via Last.fm — album art still works)
- Recent tracks list (not period-dependent)
- Total scrobble count
- Time period toggle: 7 days / 1 month / all time
- Spotify client secret never exposed to the browser
- Home page "Listening" section gains a `music →` link below `<NowPlaying />`
- Nav gains a `music` link alongside `work` and `writing`, with `aria-current` support
- Consistent with existing editorial aesthetic

---

## Architecture

### Deployment mode

Add `output: 'static'` explicitly to `astro.config.mjs` for documentation clarity (Astro 5 already defaults to this with an adapter present, but being explicit prevents future ambiguity):

```js
export default defineConfig({
  output: 'static',   // pages prerendered by default; endpoints opt out with prerender = false
  site: 'https://example.com',
  adapter: vercel(),
});
```

`output: 'static'` means all pages are prerendered at build time unless they explicitly set `export const prerender = false`. The new `/api/spotify-token.ts` endpoint uses `export const prerender = false` to opt out, consistent with the existing `/api/now-playing.ts`. `music.astro` needs no directive — prerendered by default.

`lastfm.ts` and `spotify.ts` in `src/lib/` are imported inside `<script>` tags in `music.astro`. Astro processes and bundles these imports automatically — no additional bundler configuration is needed.

Because `music.astro` is prerendered, the footer's "Updated" date in `Layout.astro` (which calls `new Date()` at render time) will reflect the build date, not the visit date. This is consistent with all other static pages on the site and is acceptable.

### Data flow on page load

```
Browser loads /music (static HTML — prerendered at build time)
  ↓
Client JS calls GET /api/spotify-token
  ↓ server reads SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET
  ↓ server POSTs to Spotify accounts.spotify.com/api/token (Client Credentials)
  Returns { access_token, expires_in }
  Token + expires_at cached in sessionStorage
  Before each reuse: if Date.now() >= expires_at → re-fetch token
  ↓
Parallel fetches (client-side, for default period '7day'):
  ① Last.fm user.getTopArtists   → top 10 artists + playcounts
  ② Last.fm user.getTopAlbums    → top 10 albums + playcounts
  ③ Last.fm user.getRecentTracks → last 10 tracks  (fetched once only)
  ④ Last.fm user.getInfo         → total scrobble count (fetched once only)
  ↓
For each top artist → URL-encode name → Spotify GET /v1/search → artist photo URL
  ↓
Render page
```

**Token exposure note:** The Spotify access token returned to the browser is short-lived (1 hr) and scoped to read-only public catalog data under the Client Credentials grant — it cannot access any user data. Returning it to the client is an intentional, accepted trade-off.

**Two distinct Spotify auth flows:** `/api/now-playing` uses Authorization Code + refresh token (user-scoped, accesses `v1/me`). `/api/spotify-token` uses Client Credentials (app-scoped, public catalog only). Both reuse `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` already in `.env`.

### Time period toggle behaviour

Clicking a period button re-fetches only Last.fm endpoints ① and ②. Endpoints ③ (recent tracks) and ④ (user info) are not re-fetched — they are period-independent. The Spotify token and artist photo URLs are reused from sessionStorage.

---

## File structure

```
src/
  lib/
    lastfm.ts          — typed fetch helpers for Last.fm user endpoints
    spotify.ts         — artist image lookup using an access token
  pages/
    music.astro        — static (prerendered) page shell + inline client <script>
    api/
      now-playing.ts   — UNCHANGED (existing)
      spotify-token.ts — NEW: GET /api/spotify-token
  components/
    NowPlaying.astro   — UNCHANGED (existing)
```

**`index.astro` change:** The existing "Listening" section (lines 83–87) becomes:
```astro
<section>
  <span class="label">Listening</span>
  <NowPlaying />
  <a href="/music" class="link" style="margin-top: 0.5rem;">music →</a>
</section>
```
Use the existing `.link` class (defined in `global.css`) rather than `.elsewhere-link`, which is scoped to the "Elsewhere" `<ul>` list context.

**`Layout.astro` change:** Add `const isMusic = pathname.startsWith('/music')` alongside existing `isWork` / `isWriting` declarations, then add:
```astro
<li>
  <a href="/music" class="nav-link" aria-current={isMusic ? 'page' : undefined}>music</a>
</li>
```

---

## API modules

### `src/lib/lastfm.ts`

Typed wrappers over native `fetch`. No npm dependency. Reads `import.meta.env.PUBLIC_LASTFM_API_KEY` and `import.meta.env.PUBLIC_LASTFM_USERNAME` — the `PUBLIC_` prefix is required for these values to be accessible in client-side `<script>` tags in Astro.

```ts
type Period = '7day' | '1month' | 'overall'

getTopArtists(period: Period, limit: number): Promise<ArtistStat[]>
getTopAlbums(period: Period, limit: number): Promise<AlbumStat[]>
getRecentTracks(limit: number): Promise<Track[]>
getUserInfo(): Promise<UserInfo>
```

Period display label → Last.fm API value mapping:
- `7 days` → `'7day'`
- `1 month` → `'1month'`
- `all time` → `'overall'`

### `src/lib/spotify.ts`

```ts
getArtistImage(artistName: string, accessToken: string): Promise<string | null>
```

- URL-encodes `artistName` using `encodeURIComponent` before building the query string
- Calls `GET /v1/search?q={encodedName}&type=artist&limit=1`
- Selects image from `artists.items[0].images`: find the first entry with `width >= 300` (sorted ascending by width), falling back to the last entry if none qualifies. This targets the 300px Spotify image for ~80px display slots, avoiding unnecessary 640px downloads.
- Returns `null` if artist not found, images array is empty, or response is HTTP 429 (no retry)

### `src/pages/api/spotify-token.ts`

```ts
export const prerender = false;
```

Responds to **`GET /api/spotify-token`**.

- Reads `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` from `import.meta.env` (server-only, no `PUBLIC_` prefix — never sent to browser)
- POSTs to `https://accounts.spotify.com/api/token`:
  ```
  Authorization: Basic btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
  Content-Type: application/x-www-form-urlencoded
  body: grant_type=client_credentials
  ```
- Returns `{ access_token: string, expires_in: number }` with headers:
  ```
  Content-Type: application/json
  Cache-Control: s-maxage=3500, stale-while-revalidate=100
  ```
  The `s-maxage=3500` allows Vercel's edge CDN to cache the token for just under its 1-hour lifetime, reducing upstream Spotify calls. This token is app-level (Client Credentials, not user-specific), so serving the same cached token to all visitors is correct and intentional — there is no per-user data at risk.
- Returns HTTP 500 if either env var is missing
- No CORS headers needed — called from the same origin

---

## `/music` page

### Layout (top → bottom)

1. **Page header** — `Listening` label + total scrobble count (`N,NNN scrobbles`)
2. **Period toggle** — three buttons: `7 days` · `1 month` · `all time`. Default: `7 days`.
3. **Top artists** — grid of up to 10. Each: square photo (~80px), artist name, playcount. Photo falls back to a monochrome CSS placeholder if `getArtistImage` returns `null`.
4. **Top albums** — grid of up to 10. Each: square cover art (~80px), album name, artist name, playcount.
5. **Recent tracks** — list of last 10. Not affected by period toggle. Each row: track name · artist · relative timestamp.

All sections use existing CSS tokens (`--fg`, `--muted`, `--border`, `--font-text`) and patterns (`.label`, `.entry`, `.entry-meta`) from `global.css`.

### Loading state

While data loads, each section renders a CSS-only skeleton using `--subtle` tone. On error, a muted "unavailable" message replaces that section. Other sections are unaffected (parallel fetches).

---

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `PUBLIC_LASTFM_API_KEY` | Client-safe | **New.** `PUBLIC_` prefix required for Astro client scripts. Add to `.env` and Vercel dashboard. Last.fm keys are read-only and rate-limited per key — client-side exposure is standard practice and carries no meaningful risk. |
| `PUBLIC_LASTFM_USERNAME` | Client-safe | **New.** Your Last.fm username. Add to `.env` and Vercel dashboard. |
| `SPOTIFY_CLIENT_ID` | Server-only | Already in `.env` and Vercel dashboard (used by `/api/now-playing`). No change needed. |
| `SPOTIFY_CLIENT_SECRET` | Server-only | Already in `.env` and Vercel dashboard. No change needed. |
| `SPOTIFY_REFRESH_TOKEN` | Server-only | Already in `.env`. Used only by `/api/now-playing`; not needed for new endpoints. |

**Vercel dashboard setup:** After adding `PUBLIC_LASTFM_API_KEY` and `PUBLIC_LASTFM_USERNAME` to `.env` locally, add them to the Vercel project's Environment Variables settings (Settings → Environment Variables). Without this step, production builds will fail silently — Last.fm fetches will use `undefined` as the API key and return errors.

---

## Error handling

- **Spotify token failure (any non-200 from `/api/spotify-token`, including HTTP 500 due to missing env vars)**: treated the same as a network error — artist photos degrade to monochrome placeholders; all Last.fm data still renders.
- **Last.fm endpoint failure (non-200 response, network error, or rate limit)**: affected section shows "unavailable"; other sections unaffected (parallel fetches).
- **Artist not found on Spotify / HTTP 429**: `getArtistImage` returns `null`; placeholder renders; no retry.
- **Home page `NowPlaying` failure**: already handled silently by the existing component. The `music →` link is static HTML — no failure mode.

---

## Dependencies to add

None. `@astrojs/vercel` is already installed. Both APIs use native `fetch`.

---

## Out of scope

- Modifying or replacing `NowPlaying.astro` or `/api/now-playing.ts`
- Scrobbling / writing data back to Last.fm
- Historical charts / graphs
- Playlist display
- Audio playback
