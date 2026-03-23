# Writings / Blog System Design

**Date**: 2026-03-22
**Status**: Approved

---

## Overview

Add a content-collection-based blog system to the portfolio's Writing section. The goal is a zero-friction authoring workflow: drop a Markdown or MDX file in a folder, commit, and the post appears on the site. No external CMS, no hardcoded arrays.

---

## Content Layer

Uses **Astro v5 Content Layer API** — the new preferred approach in Astro 5. Config lives at `src/content.config.ts` (inside `src/`, but not inside `src/content/`).

**Directory**: `src/content/writing/`

**Format**: `.md` or `.mdx`. MDX requires `@astrojs/mdx` (see Dependencies below). MDX is enabled from the start to allow custom components later without restructuring.

**Schema** (`src/content.config.ts`):

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date:  z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { writing };
```

**Frontmatter**:

```yaml
---
title: "Post title"
date: 2026-03-22
draft: true   # optional — omit or set false to publish
---
```

**Slug**: In Astro v5, entries have an `id` field (the file path relative to the loader base, e.g. `my-first-post.md`). Derive the URL slug by stripping the extension: `entry.id.replace(/\.mdx?$/, '')`. This gives `/writing/my-first-post`.

**Drafts**: Posts with `draft: true` are excluded via the `getCollection` filter. Omitting `draft` defaults to published.

---

## Dependencies

**Add `@astrojs/mdx`**:

```
pnpm add @astrojs/mdx
```

**Update `astro.config.mjs`**:

```ts
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';

export default defineConfig({
  output: 'static',
  site: 'https://example.com',
  adapter: vercel(),
  integrations: [mdx()],
});
```

---

## Index Page (`/writing`)

File: `src/pages/writing.astro`

Replace the hardcoded `posts` array with a live collection query. Remove the `excerpt` field entirely — it was a placeholder in the original hardcoded array and will not appear on the updated index.

**Query and sort**:
```ts
import { getCollection } from 'astro:content';

const posts = (await getCollection('writing', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
```

**Date display**: Format using `Intl.DateTimeFormat` to match the existing `Jan 2025` style:
```ts
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
// Usage: fmt.format(post.data.date)  →  "Mar 2026"
```

**URL**: `/writing/${entry.id.replace(/\.mdx?$/, '')}`

**Visual changes**: The `.post-excerpt` paragraph is removed. Each row shows only: index number, title (linked), date. Post count in header stays.

---

## Post Page (`/writing/[slug].astro`)

File: `src/pages/writing/[slug].astro`

Uses `getStaticPaths()` to generate one static page per published post.

```ts
export async function getStaticPaths() {
  const posts = await getCollection('writing', ({ data }) => !data.draft);
  return posts.map(entry => ({
    params: { slug: entry.id.replace(/\.mdx?$/, '') },
    props: { entry },
  }));
}
```

**Header**:
- Title in Fraunces display font (weight 300, `--text-lg` or larger), letter-spacing `-0.01em`
- Date below in `--muted`, `--text-xs`, formatted as `fmt.format(entry.data.date)` (e.g. `Mar 2026`)
- `<hr class="rule" />` below header

**Body**:
- Import `render` from `astro:content` and call `const { Content } = await render(entry);` (Astro v5 API — not the legacy `entry.render()`)
- Rendered as `<Content />` wrapped in `<div class="prose">`

**Footer**:
- `← Writing` back-link (`href="/writing"`), `--muted`, `--text-xs`, hover reveals `--fg`

**`prerender` directive**: Not needed. The global `output: 'static'` config pre-renders all pages by default.

**404 behaviour**: With `output: 'static'`, Astro only generates pages for known slugs at build time. Any URL for a non-existent or drafted post returns a Vercel 404. No custom 404 page is needed.

**Post count**: The index page already conditionally shows `{posts.length > 0 && <p class="page-sub">N posts</p>}`. This behaviour is preserved — the count is hidden when there are zero published posts.

---

## Prose Styles

`.prose` class added to `src/styles/global.css`. Because the styles target child elements, they must be in the global stylesheet (not a scoped `<style>` block, where descendant selectors on dynamic content won't apply).

| Element | Style |
|---|---|
| `p` | `line-height: 1.85`, `max-width: 65ch`, `margin-bottom: 1.4em` |
| `h2` | Fraunces, weight 300, `--text-lg`, `margin-top: 2.5em`, `letter-spacing: -0.01em` |
| `h3` | Fraunces, weight 300, `--text-base`, `margin-top: 2em` |
| `blockquote` | `border-left: 2px solid var(--border)`, `padding-left: 1rem`, `color: var(--muted)` |
| `code` (inline) | monospace, `--text-xs`, `background: var(--border)` at low opacity, `padding: 0.1em 0.3em` |
| `pre` | full-width, monospace, `--text-xs`, dark bg in both themes, `overflow-x: auto`, `padding: 1.25rem` |
| `pre code` | reset background/padding (pre provides the container) |
| `img` | `max-width: 100%`, `margin-block: 2rem` |
| `figure` | `margin-block: 2rem` |
| `figcaption` | `--text-2xs`, `color: var(--muted)`, `margin-top: 0.5rem`, centered |
| `a` | `color: inherit`, `text-decoration: underline`, `text-underline-offset: 3px`, hover `color: var(--muted)` |
| `ul`, `ol` | `padding-left: 1.4rem`, `margin-bottom: 1.2em` |
| `li` | `margin-bottom: 0.4em` |
| `hr` | same as global `.rule`: `border-top: 1px solid var(--border)`, `margin-block: 2.25rem` — no override needed |

---

## Files Changed / Created

| File | Action |
|---|---|
| `src/content.config.ts` | Create — defines `writing` collection with v5 Content Layer API |
| `src/content/writing/` | Create directory — home for all posts |
| `src/pages/writing.astro` | Modify — replace hardcoded array with collection query; remove excerpt |
| `src/pages/writing/[slug].astro` | Create — dynamic post page with prose layout |
| `src/styles/global.css` | Modify — add `.prose` styles |
| `astro.config.mjs` | Modify — add `@astrojs/mdx` integration |
| `package.json` | Modify — add `@astrojs/mdx` dependency |

---

## Out of Scope

- Tags, categories, or filtering
- Reading time estimates
- Author byline
- Comments or social sharing
- RSS feed (can be added later)
- Search
- Custom 404 page
