# Chart Toggle Design

**Date:** 2026-03-22
**Status:** Approved
**Stack:** Astro 5, vanilla TypeScript (inline `<script>`)

---

## Overview

Add a `grid · chart` view toggle to the `/music` page. Clicking `chart` replaces the photo grids for Top Artists and Top Albums with animated horizontal bar charts. Clicking `grid` restores the photo grid. The toggle is global — both sections switch together.

---

## Existing context

`src/pages/music.astro` currently contains:

- A `localStorage` cache layer (`cacheGet` / `cacheSet`) with TTL constants. `loadPeriodData` checks the cache first and returns early on a hit (lines 174–178).
- `PeriodData` interface: `{ artists: ArtistStat[]; albums: AlbumStat[]; images: Record<string, string | null> }`. The `images` field is keyed by artist name.
- `renderArtists(artists: ArtistStat[], images: Map<string, string | null>)` — renders grid into `#artists-grid`, which has class `grid`
- `renderAlbums(albums: AlbumStat[])` — renders grid into `#albums-grid`, which has class `grid`
- Period toggle handler (line 251) binds to **all** `.toggle-btn` elements via `querySelectorAll('.toggle-btn')` — it will fire on the new view buttons too unless guarded
- `.toggle` CSS: `display: flex; gap: 1.5rem` — no `justify-content` set
- `.grid` CSS: `display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr))` — will conflict with chart row layout if the class stays on the container in chart mode

---

## Changes

Single file: `src/pages/music.astro`.

### 1. HTML — toggle row

Wrap the three period buttons in a sub-div, and add a second sub-div for the view buttons. Add `justify-content: space-between` inline on the parent to avoid touching the `.toggle` CSS rule used elsewhere:

```astro
<div class="toggle" role="group" aria-label="Controls" style="justify-content: space-between;">
  <div style="display:flex;gap:1.5rem;" role="group" aria-label="Time period">
    <button class="toggle-btn active" data-period="7day">7 days</button>
    <button class="toggle-btn" data-period="1month">1 month</button>
    <button class="toggle-btn" data-period="overall">all time</button>
  </div>
  <div style="display:flex;gap:1rem;" role="group" aria-label="View mode">
    <button class="toggle-btn active" data-view="grid">grid</button>
    <button class="toggle-btn" data-view="chart">chart</button>
  </div>
</div>
```

Note: `justify-content: space-between` is applied inline rather than modifying the `.toggle` CSS class so the rule stays minimal.

### 2. Script — state and cache variables

Add at module level alongside `currentPeriod`:

```ts
let viewMode: 'grid' | 'chart' = 'grid';

// Last successfully loaded data — used for instant re-render on view toggle
let lastArtists: ArtistStat[] = [];
let lastImages: Record<string, string | null> = {};
let lastAlbums:  AlbumStat[]  = [];
```

### 3. Script — fix period toggle handler interference

Add an early return at the top of the existing period toggle handler so it ignores `[data-view]` button clicks:

```ts
document.querySelectorAll<HTMLButtonElement>('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!btn.dataset.period) return;   // ← ADD: ignore view buttons
    const period = btn.dataset.period as Period;
    if (period === currentPeriod) return;
    currentPeriod = period;

    // ← CHANGE: scope to [data-period] only so view button active state is preserved
    document.querySelectorAll('[data-period]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // ... skeleton re-render and loadPeriodData call unchanged
  });
});
```

### 4. Script — update `loadPeriodData` to respect `viewMode`

**Cache-hit path** (lines 174–178) — populate `last*` variables and branch on `viewMode`:

```ts
if (cached) {
  lastArtists = cached.artists;
  lastImages  = cached.images;
  lastAlbums  = cached.albums;
  if (viewMode === 'chart') {
    renderArtistsChart(cached.artists);
    renderAlbumsChart(cached.albums);
  } else {
    renderArtists(cached.artists, new Map(Object.entries(cached.images)));
    renderAlbums(cached.albums);
  }
  return;
}
```

**Live-fetch path** — populate `last*` variables and branch on `viewMode`:

```ts
// Albums
if (albumsResult.status === 'fulfilled') {
  lastAlbums = albumsResult.value;
  if (viewMode === 'chart') {
    renderAlbumsChart(albumsResult.value);
  } else {
    renderAlbums(albumsResult.value);
  }
} else {
  showError('section-albums');
}

// Artists
if (artistsResult.status === 'fulfilled') {
  const artists = artistsResult.value;
  let images: Record<string, string | null> = {};
  try {
    const params = new URLSearchParams(artists.map((a) => ['names', a.name] as [string, string]));
    const res = await fetch(`/api/artist-images?${params}`);
    if (res.ok) images = await res.json() as Record<string, string | null>;
  } catch { /* images are non-critical */ }

  lastArtists = artists;
  lastImages  = images;

  if (viewMode === 'chart') {
    renderArtistsChart(artists);
  } else {
    renderArtists(artists, new Map(Object.entries(images)));
  }

  if (albumsResult.status === 'fulfilled') {
    cacheSet<PeriodData>(cacheKey, { artists, albums: albumsResult.value, images });
  }
} else {
  showError('section-artists');
}
```

### 5. Script — chart render functions

Add alongside the existing `renderArtists` / `renderAlbums`:

```ts
function renderArtistsChart(artists: ArtistStat[]) {
  const grid = document.getElementById('artists-grid')!;
  grid.classList.add('chart-view');
  const max = artists[0]?.playcount ?? 1;
  grid.innerHTML = artists.map((a, i) => `
    <div class="chart-row" style="--delay:${i * 40}ms">
      <span class="chart-label">${esc(a.name)}</span>
      <div class="chart-track">
        <div class="chart-bar" style="--pct:${(a.playcount / max) * 100}%"></div>
      </div>
      <span class="chart-count">${a.playcount.toLocaleString()}</span>
    </div>`).join('');
}

function renderAlbumsChart(albums: AlbumStat[]) {
  const grid = document.getElementById('albums-grid')!;
  grid.classList.add('chart-view');
  const max = albums[0]?.playcount ?? 1;
  grid.innerHTML = albums.map((a, i) => `
    <div class="chart-row" style="--delay:${i * 40}ms">
      <span class="chart-label">${esc(a.name)}<br><span class="chart-sublabel">${esc(a.artist)}</span></span>
      <div class="chart-track">
        <div class="chart-bar" style="--pct:${(a.playcount / max) * 100}%"></div>
      </div>
      <span class="chart-count">${a.playcount.toLocaleString()}</span>
    </div>`).join('');
}
```

Note: `grid.classList.add('chart-view')` overrides the `.grid` auto-fill layout (see CSS section). The existing `renderArtists` and `renderAlbums` must remove this class when called:

```ts
function renderArtists(artists: ArtistStat[], images: Map<string, string | null>) {
  const grid = document.getElementById('artists-grid')!;
  grid.classList.remove('chart-view');   // ← ADD
  // ... rest unchanged
}

function renderAlbums(albums: AlbumStat[]) {
  const grid = document.getElementById('albums-grid')!;
  grid.classList.remove('chart-view');   // ← ADD
  // ... rest unchanged
}
```

### 6. Script — view toggle handler

Add after the period toggle handler:

```ts
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.view as 'grid' | 'chart';
    if (mode === viewMode) return;
    viewMode = mode;

    document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (viewMode === 'chart') {
      renderArtistsChart(lastArtists);
      renderAlbumsChart(lastAlbums);
    } else {
      renderArtists(lastArtists, new Map(Object.entries(lastImages)));
      renderAlbums(lastAlbums);
    }
  });
});
```

If `lastArtists` / `lastAlbums` are empty (data hasn't loaded yet), the render functions emit empty HTML — the skeleton state persists and the view switch is a no-op until data arrives.

### 7. Script — period toggle skeleton re-render

The existing period toggle re-renders skeletons as `grid-item` divs. In chart mode those are invisible (wrong container layout). Update it to re-render the appropriate skeleton based on `viewMode`:

```ts
if (viewMode === 'chart') {
  artistsGrid.innerHTML = Array.from({ length: 10 }, (_, i) =>
    `<div class="chart-row" style="--delay:${i * 40}ms">
      <span class="chart-label" style="background:var(--subtle);height:0.75rem;border-radius:2px"></span>
      <div class="chart-track"><div class="chart-bar" style="--pct:60%"></div></div>
      <span class="chart-count" style="background:var(--subtle);width:2rem;height:0.75rem;border-radius:2px"></span>
    </div>`).join('');
  albumsGrid.innerHTML = artistsGrid.innerHTML;
} else {
  artistsGrid.innerHTML = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');
  albumsGrid.innerHTML  = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');
}
```

### 8. CSS

Add to the `<style>` block:

```css
/* Chart view — overrides .grid auto-fill when active */
.chart-view {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Chart rows */
.chart-row {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.3rem 0;
}

.chart-label {
  font-size: var(--text-xs);
  color: var(--fg);
  text-align: right;
  line-height: 1.3;
}

.chart-sublabel {
  font-size: var(--text-2xs);
  color: var(--muted);
}

.chart-track {
  height: 4px;
  background: var(--subtle);
  border-radius: 2px;
  overflow: hidden;
}

.chart-bar {
  height: 100%;
  width: 0;
  background: var(--fg);
  border-radius: 2px;
  animation: bar-grow 600ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay, 0ms) forwards;
}

@keyframes bar-grow {
  from { width: 0; }
  to   { width: var(--pct); }
}

.chart-count {
  font-size: var(--text-2xs);
  color: var(--muted);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .chart-bar {
    animation: none;
    width: var(--pct);
  }
}
```

---

## Data flow summary

```
User toggles grid → chart
  ↓
viewMode = 'chart'
  ↓
renderArtistsChart(lastArtists)   — uses cached data, no re-fetch
renderAlbumsChart(lastAlbums)     — uses cached data, no re-fetch

User changes period (while in chart mode)
  ↓
loadPeriodData(newPeriod)
  ↓
  cache hit? → populate last*, renderArtistsChart / renderAlbumsChart
  cache miss? → fetch → populate last*, renderArtistsChart / renderAlbumsChart
```

---

## Out of scope

- Charts for recent tracks (no playcount data)
- Per-section view toggles
- Saved view preference across sessions
- Chart for anything other than artists and albums
