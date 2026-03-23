# Writings / Blog System Design

**Date**: 2026-03-22
**Status**: Approved

---

## Overview

Add a content-collection-based blog system to the portfolio's Writing section. The goal is a zero-friction authoring workflow: drop a Markdown or MDX file in a folder, commit, and the post appears on the site. No external CMS, no hardcoded arrays.

---

## Content Layer

**Directory**: `src/content/writing/`

**Format**: `.md` or `.mdx` (MDX enabled to allow custom components in future without restructuring)

**Schema** (`src/content/config.ts`):

```ts
const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date:  z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});
```

**Frontmatter**:

```yaml
---
title: "Post title"
date: 2026-03-22
draft: true   # optional — omit or set false to publish
---
```

**Slug**: derived from filename (e.g. `my-first-post.md` → `/writing/my-first-post`). No slug field in frontmatter.

**Drafts**: posts with `draft: true` are excluded at build time. Omitting `draft` defaults to published.

---

## Index Page (`/writing`)

File: `src/pages/writing.astro`

Replace the hardcoded `posts` array with an Astro Content Collections query:

1. `getCollection('writing', ({ data }) => !data.draft)` — fetch all published posts
2. Sort by `data.date` descending (newest first)
3. Render existing numbered list UI — no visual changes

Post count in header (`N posts`) remains. Each row shows: index number, title (linked), date.

---

## Post Page (`/writing/[slug].astro`)

File: `src/pages/writing/[slug].astro`

Uses `getStaticPaths()` to generate one static page per published post.

**Header**:
- Title in Fraunces display font (weight 300, `--text-lg` or larger), letter-spacing `-0.01em`
- Date below in `--muted`, `--text-xs`
- `<hr class="rule" />` below header

**Body**:
- Post content rendered via the `<Content />` component from the collection entry
- Wrapped in a `<div class="prose">` for scoped typography styles

**Footer**:
- `← Writing` back-link in `--muted`, `--text-xs`, hover reveals `--fg`

---

## Prose Styles

Scoped `.prose` class added to `src/styles/global.css` (or as a scoped `<style>` in the post page).

| Element | Style |
|---|---|
| `p` | `line-height: 1.85`, `max-width: 65ch`, `margin-bottom: 1.4em` |
| `h2` | Fraunces, weight 300, `--text-lg`, `margin-top: 2.5em`, `letter-spacing: -0.01em` |
| `h3` | Fraunces, weight 300, `--text-base`, `margin-top: 2em` |
| `blockquote` | `border-left: 2px solid var(--border)`, `padding-left: 1rem`, `color: var(--muted)` |
| `code` (inline) | monospace, `--text-xs`, subtle background (`var(--border)` at low opacity), `padding: 0.1em 0.3em` |
| `pre` | full-width, monospace, `--text-xs`, dark bg in both themes, `overflow-x: auto`, `padding: 1.25rem` |
| `img` | `max-width: 100%`, `margin-block: 2rem` |
| `figure` | `margin-block: 2rem` |
| `figcaption` | `--text-2xs`, `color: var(--muted)`, `margin-top: 0.5rem`, centered |
| `a` | `color: inherit`, `text-decoration: underline`, `text-underline-offset: 3px`, hover `color: var(--muted)` |
| `ul`, `ol` | `padding-left: 1.4rem`, `margin-bottom: 1.2em` |
| `li` | `margin-bottom: 0.4em` |
| `hr` | reuses `.rule` (1px solid `var(--border)`, `margin-block: 2.25rem`) |

---

## Files Changed / Created

| File | Action |
|---|---|
| `src/content/config.ts` | Create — defines `writing` collection schema |
| `src/content/writing/` | Create directory — home for all posts |
| `src/pages/writing.astro` | Modify — replace hardcoded array with collection query |
| `src/pages/writing/[slug].astro` | Create — dynamic post page with prose layout |
| `src/styles/global.css` | Modify — add `.prose` styles |

---

## Out of Scope

- Tags, categories, or filtering
- Reading time estimates
- Author byline
- Comments or social sharing
- RSS feed (can be added later)
- Search
