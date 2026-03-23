# Pictures Page: Image System Design

**Date**: 2026-03-22
**Status**: Approved

## Overview

Populate the pictures page with photos sourced from Cloudinary, fetched automatically at build time. No image files in the repository. No manual metadata files. Adding a photo requires only uploading to Cloudinary and redeploying.

## Goals

- Support a growing photo collection without repo bloat
- Zero per-photo code changes — upload and redeploy is the full workflow
- Automatic image optimization (WebP/AVIF, responsive sizing) via Cloudinary URLs
- Optional per-photo captions and alt text set in Cloudinary UI, not in code

## Non-Goals

- Photo grouping or albums
- Lightbox or full-screen viewer
- Client-side filtering or search
- EXIF data extraction (upload date used instead)

## Architecture

### Data flow

```
User uploads photo to Cloudinary (folder: pictures/)
        ↓
Vercel build runs
        ↓
pictures.astro fetches Cloudinary Admin API → list of images
        ↓
Page renders photos sorted newest-first
```

### Image storage

Photos live in a dedicated `pictures/` folder in the user's Cloudinary account. The repository contains no image files.

### Metadata

All metadata is derived automatically:

| Field | Source |
|-------|--------|
| `src` | Cloudinary URL with `w_1200,f_auto,q_auto` transformation |
| `alt` | `context.alt` field in Cloudinary (optional, defaults to empty string) |
| `date` | `created_at` from Cloudinary API, formatted as "Mon YYYY" |
| `caption` | `context.caption` field in Cloudinary (optional) |

### Environment variables

Three variables required, set in Vercel project settings and local `.env`:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

If any variable is absent (e.g., local dev before setup), the fetch is skipped and the page shows the empty state — no crash.

## Implementation

### `src/pages/pictures.astro` — frontmatter only

Replace the static `photos` array with a build-time fetch:

```typescript
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = import.meta.env;

let photos: { src: string; alt: string; date: string; caption?: string }[] = [];

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image?type=upload&prefix=pictures/&max_results=500`,
    { headers: { Authorization: `Basic ${btoa(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`)}` } }
  );
  const { resources } = await res.json();

  photos = resources
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((r: any) => ({
      src: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_1200,f_auto,q_auto/${r.public_id}`,
      alt: r.context?.alt ?? '',
      date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      caption: r.context?.caption,
    }));
}
```

The render template and styles in `pictures.astro` are unchanged.

### No other files change

No new files, no new components, no content collections.

## Deployment workflow

### Manual

1. Upload photo to Cloudinary under the `pictures/` folder
2. Trigger a redeploy in Vercel

### Automated (optional)

Configure a Cloudinary upload notification webhook pointing at a Vercel deploy hook URL. New uploads automatically trigger a rebuild without manual intervention.

Setup:
1. Vercel → Project Settings → Git → Create deploy hook → copy URL
2. Cloudinary → Settings → Notifications → Add URL

## Constraints and tradeoffs

| Concern | Notes |
|---------|-------|
| Build-time API call | Adds ~1s to build. Acceptable for a portfolio. |
| Cloudinary free tier | 25 credits/month; generous for a personal portfolio. |
| Max 500 photos per fetch | Hardcoded `max_results=500`. Pagination not needed unless collection exceeds this. |
| No offline dev | Requires valid credentials + internet to see photos locally. Empty state shown otherwise. |
| Image order | Sorted by Cloudinary upload date, not photo EXIF date. Upload in chronological order if order matters. |
