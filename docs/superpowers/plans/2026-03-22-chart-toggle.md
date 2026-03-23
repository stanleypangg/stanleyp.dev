# Chart Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `grid · chart` view toggle to `/music` so users can switch Top Artists and Top Albums between photo grids and animated horizontal bar charts without re-fetching data.

**Architecture:** All changes are confined to `src/pages/music.astro`. The HTML toggle row gains a second sub-group of `[data-view]` buttons. The inline `<script>` block gains a `viewMode` state variable, module-level `last*` cache variables, two new chart render functions, a view toggle handler, and updates to `loadPeriodData` and the period skeleton re-render. CSS gains chart-specific rules and a `@keyframes bar-grow` animation.

**Tech Stack:** Astro 5, vanilla TypeScript (inline `<script>`), CSS custom properties + `@keyframes`

---

### Task 1: HTML toggle restructure + chart CSS

**Files:**
- Modify: `src/pages/music.astro:14-18` (toggle HTML)
- Modify: `src/pages/music.astro` `<style>` block

- [ ] **Step 1: Restructure the toggle HTML**

Replace lines 14–18:
```astro
  <!-- Period toggle -->
  <div class="toggle" role="group" aria-label="Time period">
    <button class="toggle-btn active" data-period="7day">7 days</button>
    <button class="toggle-btn" data-period="1month">1 month</button>
    <button class="toggle-btn" data-period="overall">all time</button>
  </div>
```

With:
```astro
  <!-- Controls: period + view toggle -->
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

Note: `justify-content: space-between` is applied inline, not to the `.toggle` class, so the rule stays minimal.

- [ ] **Step 2: Add chart CSS to the `<style>` block**

Add before `</style>`:
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

/* View toggle buttons — suppress the padding-left indent that period buttons use.
   Without this, clicking "chart" would shift it rightward inside the right-side flex group. */
[data-view].toggle-btn:hover,
[data-view].toggle-btn.active {
  padding-left: 0;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/music.astro
git commit -m "feat: restructure toggle row and add chart CSS"
```

---

### Task 2: Script — state variables + period handler fixes

**Files:**
- Modify: `src/pages/music.astro` (script block, lines ~168 and ~251–268)

- [ ] **Step 1: Add module-level state variables**

After the existing `let currentPeriod: Period = '7day';` line (~line 168), add:

```ts
let viewMode: 'grid' | 'chart' = 'grid';

// Last successfully loaded data — used for instant re-render on view toggle
let lastArtists: ArtistStat[] = [];
let lastImages: Record<string, string | null> = {};
let lastAlbums:  AlbumStat[]  = [];
```

- [ ] **Step 2: Guard period handler against view button clicks**

Inside the `.toggle-btn` click handler (around line 252), add as the first line of the async callback:

```ts
if (!btn.dataset.period) return;   // ignore view buttons
```

The full handler open should look like:
```ts
btn.addEventListener('click', async () => {
  if (!btn.dataset.period) return;   // ← ADD THIS LINE
  const period = btn.dataset.period as Period;
  if (period === currentPeriod) return;
```

- [ ] **Step 3: Scope active-state reset to period buttons only**

In the period handler, change the active-state reset line (~line 258):

```ts
// BEFORE:
document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
// AFTER:
document.querySelectorAll('[data-period]').forEach((b) => b.classList.remove('active'));
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors. The new `let` declarations use correct types from the imported `ArtistStat` / `AlbumStat`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/music.astro
git commit -m "feat: add viewMode/last* state vars and fix period handler to ignore view buttons"
```

---

### Task 3: Chart render functions

**Files:**
- Modify: `src/pages/music.astro` (script block, render functions ~lines 117–146)

- [ ] **Step 1: Add `.chart-view` removal to `renderArtists`**

In `renderArtists` (~line 118), after `const grid = document.getElementById('artists-grid')!;`, add:

```ts
grid.classList.remove('chart-view');
```

- [ ] **Step 2: Add `.chart-view` removal to `renderAlbums`**

In `renderAlbums` (~line 134), after `const grid = document.getElementById('albums-grid')!;`, add:

```ts
grid.classList.remove('chart-view');
```

- [ ] **Step 3: Add `renderArtistsChart`**

After the `renderAlbums` function, add:

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
```

- [ ] **Step 4: Add `renderAlbumsChart`**

After `renderArtistsChart`, add:

```ts
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

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No TypeScript errors. Functions reference `ArtistStat` / `AlbumStat` properties correctly (`a.name`, `a.playcount`, `a.artist`).

- [ ] **Step 6: Commit**

```bash
git add src/pages/music.astro
git commit -m "feat: add renderArtistsChart and renderAlbumsChart"
```

---

### Task 4: Update `loadPeriodData` to respect `viewMode`

**Files:**
- Modify: `src/pages/music.astro:170-212` (`loadPeriodData` function)

- [ ] **Step 1: Update cache-hit path**

Replace the cache-hit early-return block (~lines 174–178):
```ts
if (cached) {
  renderArtists(cached.artists, new Map(Object.entries(cached.images)));
  renderAlbums(cached.albums);
  return;
}
```

With:
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

- [ ] **Step 2: Update live-fetch path — albums**

Replace the albums render block (~lines 186–190):
```ts
if (albumsResult.status === 'fulfilled') {
  renderAlbums(albumsResult.value);
} else {
  showError('section-albums');
}
```

With:
```ts
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
```

- [ ] **Step 3: Update live-fetch path — artists**

Inside `if (artistsResult.status === 'fulfilled')`, replace the call to `renderArtists` (~line 204):
```ts
renderArtists(artists, new Map(Object.entries(images)));
```

With:
```ts
lastArtists = artists;
lastImages  = images;

if (viewMode === 'chart') {
  renderArtistsChart(artists);
} else {
  renderArtists(artists, new Map(Object.entries(images)));
}
```

**Important:** Replace only the single `renderArtists(...)` call on line 204. The `if (albumsResult.status === 'fulfilled') { cacheSet... }` block immediately below it (lines 206–208) is not part of this replacement and must be left in place.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/music.astro
git commit -m "feat: loadPeriodData populates last* vars and branches on viewMode"
```

---

### Task 5: View toggle handler + chart-mode period skeleton

**Files:**
- Modify: `src/pages/music.astro` (script block, ~lines 264–269)

- [ ] **Step 1: Add view toggle handler**

After the period toggle handler's closing `});` (~line 269), add:

```ts
// ── View toggle ───────────────────────────────────────────────────────────
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

If `lastArtists` / `lastAlbums` are empty (data hasn't loaded yet), the chart render functions emit empty HTML — the skeleton state persists and the switch is a no-op until data arrives.

- [ ] **Step 2: Update period skeleton re-render for chart mode**

In the period toggle handler, replace the skeleton re-render lines (~lines 264–265):
```ts
artistsGrid.innerHTML = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');
albumsGrid.innerHTML  = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');
```

With:
```ts
if (viewMode === 'chart') {
  artistsGrid.classList.add('chart-view');
  artistsGrid.innerHTML = Array.from({ length: 10 }, (_, i) =>
    `<div class="chart-row" style="--delay:${i * 40}ms">
      <span class="chart-label" style="background:var(--subtle);height:0.75rem;border-radius:2px"></span>
      <div class="chart-track"><div class="chart-bar" style="--pct:60%"></div></div>
      <span class="chart-count" style="background:var(--subtle);width:2rem;height:0.75rem;border-radius:2px"></span>
    </div>`).join('');
  albumsGrid.classList.add('chart-view');
  albumsGrid.innerHTML = artistsGrid.innerHTML;
} else {
  artistsGrid.innerHTML = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');
  albumsGrid.innerHTML  = Array.from({ length: 10 }, () => '<div class="grid-item skeleton"></div>').join('');
}
```

Note: `artistsGrid` and `albumsGrid` are already declared earlier in the same period handler; no new declarations needed.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/music.astro
git commit -m "feat: add view toggle handler and chart-mode period skeleton"
```

---

### Task 6: Manual integration verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Open: `http://localhost:4321/music`

- [ ] **Step 2: Verify default grid mode**

Expected:
- Controls row shows period buttons left, "grid · chart" right
- "grid" button is active (padded, full-color); "chart" is muted
- Artists and albums render as photo grids after data loads

- [ ] **Step 3: Verify chart mode switch**

Click "chart".
Expected:
- "chart" becomes active; "grid" loses active styling
- Both grids transition to horizontal bar charts
- Bars animate in with stagger (bar 1 first, bar 10 last ~360ms later)
- No network request fires (devtools Network tab shows no new calls)

- [ ] **Step 4: Verify period switch while in chart mode**

Click "1 month" while viewing chart.
Expected:
- Chart skeleton rows appear (not grid-item squares)
- After data loads, bars animate in for the new period
- "chart" button active state is preserved; period buttons update normally

- [ ] **Step 5: Verify switching back to grid**

Click "grid".
Expected:
- Photo grids restore instantly using cached `last*` data
- "grid" becomes active; "chart" loses active styling

- [ ] **Step 6: Verify reduced-motion**

In DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce".
Expected:
- Bars appear at full width immediately (no animation)

- [ ] **Step 7: Commit any fixes found during verification**

```bash
git add src/pages/music.astro
git commit -m "fix: address issues found during chart toggle integration verification"
```
(Skip if no fixes were needed.)
