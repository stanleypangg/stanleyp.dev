# Chart Toggle Design

**Date:** 2026-03-22
**Status:** Approved
**Stack:** Astro 5, vanilla TypeScript (inline `<script>`)

---

## Overview

Add a `grid · chart` view toggle to the `/music` page. Clicking `chart` replaces the photo grids for Top Artists and Top Albums with animated horizontal bar charts. Clicking `grid` restores the photo grid. The toggle is global — both sections switch together.

---

## Existing context

`src/pages/music.astro` contains:
- A period toggle row (`7 days · 1 month · all time`) implemented as `<button class="toggle-btn">` elements inside `<div class="toggle">`
- `renderArtists(artists, images)` — renders artist photo grid into `#artists-grid`
- `renderAlbums(albums)` — renders album photo grid into `#albums-grid`
- A `viewMode` concept does not yet exist

---

## Changes

Single file: `src/pages/music.astro`.

### 1. HTML — toggle row

Add `grid · chart` buttons to the right end of the existing period toggle row. The period buttons stay left-aligned; the view buttons sit right-aligned via `justify-content: space-between`:

```astro
<div class="toggle" role="group" aria-label="Time period">
  <div style="display:flex;gap:1.5rem;">
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

### 2. Script — state and render functions

Add `viewMode` state:

```ts
let viewMode: 'grid' | 'chart' = 'grid';
```

Add two chart render functions:

```ts
function renderArtistsChart(artists: ArtistStat[]) {
  const grid = document.getElementById('artists-grid')!;
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

Update `loadPeriodData` to call the correct render function based on `viewMode`:

```ts
// Artists
if (artistsResult.status === 'fulfilled') {
  const artists = artistsResult.value;
  if (viewMode === 'chart') {
    renderArtistsChart(artists);
  } else {
    const token = await getSpotifyToken();
    const imageEntries = await Promise.all(
      artists.map(async (a) => {
        const img = token ? await getArtistImage(a.name, token) : null;
        return [a.name, img] as [string, string | null];
      })
    );
    renderArtists(artists, new Map(imageEntries));
  }
}

// Albums
if (albumsResult.status === 'fulfilled') {
  if (viewMode === 'chart') {
    renderAlbumsChart(albumsResult.value);
  } else {
    renderAlbums(albumsResult.value);
  }
}
```

Store last-loaded data for instant re-render on view toggle (no re-fetch):

```ts
let lastArtists: ArtistStat[] = [];
let lastArtistImages: Map<string, string | null> = new Map();
let lastAlbums: AlbumStat[] = [];
```

Store the resolved values into these variables inside `loadPeriodData` after each successful fetch.

Add view toggle click handler:

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
      renderArtists(lastArtists, lastArtistImages);
      renderAlbums(lastAlbums);
    }
  });
});
```

### 3. CSS

Add chart layout styles:

```css
/* Chart view */
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

## Toggle row layout note

The existing `.toggle` div uses `display:flex;gap:1.5rem`. Wrapping periods in a sub-div and adding a second sub-div for view buttons, with `justify-content:space-between` on the parent, keeps the existing CSS class intact while splitting the two groups.

---

## Data caching

`lastArtists`, `lastArtistImages`, and `lastAlbums` are module-level variables populated after each successful `loadPeriodData` call. When the user toggles view mode, these cached values are passed directly to the render functions — no re-fetch, instant switch.

If `lastArtists` is empty (data hasn't loaded yet), toggling view mode is a no-op on render (the skeleton state persists). When data loads, it renders into whichever view mode is currently active.

---

## Error handling

No change to existing error handling. `showError()` still replaces section content with "unavailable" on fetch failure. Chart functions are only called when data is available.

---

## Out of scope

- Charts for recent tracks (no playcount data)
- Per-section view toggles
- Saved view preference across sessions
- Chart for anything other than artists and albums
