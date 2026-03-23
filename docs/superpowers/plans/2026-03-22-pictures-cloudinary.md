# Pictures Page: Cloudinary Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static empty `photos` array in `pictures.astro` with a build-time fetch from Cloudinary's Admin API, so photos appear automatically after being uploaded to Cloudinary.

**Architecture:** At build time, Astro's server-side frontmatter calls the Cloudinary Admin API to list all images in the `pictures/` folder. The response is mapped to the existing `{ src, alt, date, caption? }` shape. If credentials are absent, the page gracefully shows the empty state.

**Tech Stack:** Astro 5 (static), Cloudinary Admin API (REST, Basic auth), Vitest, Vercel

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/pages/pictures.astro` | Replace static array with Cloudinary fetch |
| Create | `src/lib/cloudinary.ts` | Mapping logic extracted for testability |
| Create | `src/lib/cloudinary.test.ts` | Unit tests for mapping function |
| Create | `.env.example` | Documents required env vars for future reference |

---

## Task 1: Add `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```bash
# .env.example
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- [ ] **Step 2: Create local `.env` with your real credentials**

Copy `.env.example` to `.env` and fill in your actual values from the Cloudinary dashboard (Settings → API Keys).

```bash
cp .env.example .env
# then edit .env with real values
```

- [ ] **Step 3: Verify `.env` is gitignored**

Check `.gitignore` — if `.env` is not listed, add it now before proceeding.

- [ ] **Step 4: Commit `.env.example`**

```bash
git add .env.example
git commit -m "chore: add env.example with Cloudinary variable names"
```

---

## Task 2: Write failing tests for the mapping helper

**Files:**
- Create: `src/lib/cloudinary.ts` (stub only)
- Create: `src/lib/cloudinary.test.ts`

- [ ] **Step 1: Create stub `src/lib/cloudinary.ts`**

```typescript
export type CloudinaryResource = {
  public_id: string;
  created_at: string;
  context?: { alt?: string; caption?: string };
};

export type Photo = {
  src: string;
  alt: string;
  date: string;
  caption?: string;
};

export function mapResource(cloudName: string, resource: CloudinaryResource): Photo {
  throw new Error('not implemented');
}

export function sortNewestFirst(resources: CloudinaryResource[]): CloudinaryResource[] {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write tests in `src/lib/cloudinary.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { mapResource, sortNewestFirst } from './cloudinary';

const baseResource = {
  public_id: 'pictures/my-photo',
  created_at: '2025-04-15T10:00:00Z',
};

describe('mapResource', () => {
  it('builds the correct Cloudinary URL with optimization params', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.src).toBe(
      'https://res.cloudinary.com/mycloud/image/upload/w_1200,f_auto,q_auto/pictures/my-photo'
    );
  });

  it('formats date as "Mon YYYY"', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.date).toBe('Apr 2025');
  });

  it('defaults alt to empty string when context is absent', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.alt).toBe('');
  });

  it('reads alt from context.alt when present', () => {
    const photo = mapResource('mycloud', { ...baseResource, context: { alt: 'A sunset' } });
    expect(photo.alt).toBe('A sunset');
  });

  it('reads caption from context.caption when present', () => {
    const photo = mapResource('mycloud', { ...baseResource, context: { caption: 'Rome, 2025' } });
    expect(photo.caption).toBe('Rome, 2025');
  });

  it('omits caption when context is absent', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.caption).toBeUndefined();
  });
});

describe('sortNewestFirst', () => {
  it('sorts resources newest-first by created_at', () => {
    const resources = [
      { ...baseResource, created_at: '2025-01-01T00:00:00Z' },
      { ...baseResource, created_at: '2025-06-01T00:00:00Z' },
      { ...baseResource, created_at: '2025-03-01T00:00:00Z' },
    ];
    const sorted = sortNewestFirst(resources);
    expect(sorted[0].created_at).toBe('2025-06-01T00:00:00Z');
    expect(sorted[2].created_at).toBe('2025-01-01T00:00:00Z');
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
pnpm test
```

Expected: all tests in `cloudinary.test.ts` fail with "not implemented"

---

## Task 3: Implement the mapping helper

**Files:**
- Modify: `src/lib/cloudinary.ts`

- [ ] **Step 1: Implement `mapResource` and `sortNewestFirst`**

Replace the stub with:

```typescript
export type CloudinaryResource = {
  public_id: string;
  created_at: string;
  context?: { alt?: string; caption?: string };
};

export type Photo = {
  src: string;
  alt: string;
  date: string;
  caption?: string;
};

export function mapResource(cloudName: string, resource: CloudinaryResource): Photo {
  return {
    src: `https://res.cloudinary.com/${cloudName}/image/upload/w_1200,f_auto,q_auto/${resource.public_id}`,
    alt: resource.context?.alt ?? '',
    date: new Date(resource.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    caption: resource.context?.caption,
  };
}

export function sortNewestFirst(resources: CloudinaryResource[]): CloudinaryResource[] {
  return [...resources].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
pnpm test
```

Expected: all 7 tests in `cloudinary.test.ts` pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudinary.ts src/lib/cloudinary.test.ts
git commit -m "feat: add Cloudinary resource mapping helpers"
```

---

## Task 4: Update `pictures.astro` to fetch from Cloudinary

**Files:**
- Modify: `src/pages/pictures.astro`

- [ ] **Step 1: Replace the frontmatter**

Open `src/pages/pictures.astro`. Replace lines 1–17 (the entire `---` frontmatter block including the static `photos` array) with:

```typescript
---
import Layout from '../layouts/Layout.astro';
import { mapResource, sortNewestFirst } from '../lib/cloudinary';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = import.meta.env;

let photos: { src: string; alt: string; date: string; caption?: string }[] = [];

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image?type=upload&prefix=pictures/&max_results=500`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`)}`,
      },
    }
  );
  const { resources } = await res.json();
  photos = sortNewestFirst(resources).map(r => mapResource(CLOUDINARY_CLOUD_NAME, r));
}
---
```

Everything below the closing `---` is unchanged.

- [ ] **Step 2: Verify build succeeds with credentials**

```bash
pnpm build
```

Expected: build completes, `dist/pictures/index.html` contains `<img` tags with `res.cloudinary.com` URLs.

- [ ] **Step 3: Verify graceful empty state without credentials**

Temporarily rename `.env` to `.env.bak`, build, then restore:

```bash
mv .env .env.bak && pnpm build && mv .env.bak .env
```

Expected: build completes, `dist/pictures/index.html` contains "Nothing here yet."

- [ ] **Step 4: Commit**

```bash
git add src/pages/pictures.astro
git commit -m "feat: populate pictures page from Cloudinary at build time"
```

---

## Task 5: (Optional) Configure automatic redeploy webhook

This task is optional. Skip if manual redeploy is acceptable.

- [ ] **Step 1: Create Vercel deploy hook**

Vercel dashboard → Project → Settings → Git → Deploy Hooks → Create hook named "cloudinary-upload" → copy the generated URL.

- [ ] **Step 2: Register webhook in Cloudinary**

Cloudinary dashboard → Settings → Notifications → Add notification URL → paste the Vercel hook URL → select "Upload" event type → Save.

- [ ] **Step 3: Verify**

Upload a test image to the `pictures/` folder in Cloudinary. Confirm a new deployment appears in Vercel within ~30 seconds.

---

## Verification checklist

After completing all tasks:

- [ ] `pnpm test` passes with 0 failures
- [ ] `pnpm build` succeeds with Cloudinary credentials present
- [ ] `pnpm build` succeeds without credentials (empty state, no crash)
- [ ] Pictures page in production shows uploaded photos sorted newest-first
- [ ] Adding a new photo to Cloudinary and redeploying shows it on the page
