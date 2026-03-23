# Writings Blog System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded writing page with a file-based blog system using Astro v5 Content Collections, where adding a post means dropping a `.md` or `.mdx` file into `src/content/writing/`.

**Architecture:** Astro v5 Content Layer API — a `glob` loader reads flat Markdown/MDX files from `src/content/writing/`, validates frontmatter with Zod, and generates a static page per post at `/writing/[slug]`. The index at `/writing` queries the collection and renders a reverse-chronological list.

**Tech Stack:** Astro v5, `@astrojs/mdx`, Zod (bundled with Astro), pnpm

**Spec:** `docs/superpowers/specs/2026-03-22-writings-blog-design.md`

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/content.config.ts` | Create | Defines `writing` collection schema |
| `src/content/writing/` | Create dir | Home for all post files |
| `src/content/writing/hello-world.md` | Create (sample) | First post used to verify everything works |
| `astro.config.mjs` | Modify | Add `@astrojs/mdx` integration |
| `src/pages/writing.astro` | Modify | Replace hardcoded array with collection query |
| `src/pages/writing/[slug].astro` | Create | Dynamic post page with prose layout |
| `src/styles/global.css` | Modify | Add `.prose` typographic styles |

---

## Task 1: Install MDX dependency and update Astro config

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install the package**

```bash
pnpm add @astrojs/mdx
```

Expected: `package.json` updated, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Update `astro.config.mjs`**

Replace the entire file with:

```js
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

- [ ] **Step 3: Verify the dev server still starts**

```bash
pnpm dev
```

Expected: Server starts at `http://localhost:4321` with no errors. Kill with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs package.json pnpm-lock.yaml
git commit -m "feat: add @astrojs/mdx integration"
```

---

## Task 2: Create the content collection config

**Files:**
- Create: `src/content.config.ts`

- [ ] **Step 1: Create `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date:  z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { writing };
```

Note: The file lives at `src/content.config.ts` — inside `src/` but **not** inside `src/content/`. This is the Astro v5 location.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: Build completes with no errors. (This surfaces Zod/TS errors in the collection config. The content directory can be empty at this stage — Astro handles that gracefully.)

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: define writing content collection"
```

---

## Task 3: Add the content directory and a sample post

**Files:**
- Create: `src/content/writing/hello-world.md`

- [ ] **Step 1: Create the directory and sample post**

```bash
mkdir -p src/content/writing
```

Create `src/content/writing/hello-world.md`:

```markdown
---
title: "Hello, World"
date: 2026-03-22
---

This is the first post. It exists to verify the blog system works end-to-end.

## A heading

Some paragraph text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
```

(No `draft` field — defaults to published.)

- [ ] **Step 2: Verify the collection resolves**

```bash
pnpm dev
```

Open `http://localhost:4321/writing` in a browser. Expected: The page renders without a 500 error (it will still show the old hardcoded UI for now — that's fine, collection wiring comes in Task 4). Kill with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/content/writing/hello-world.md
git commit -m "feat: add sample writing post"
```

---

## Task 4: Update the writing index page

**Files:**
- Modify: `src/pages/writing.astro`

The current file has a hardcoded `posts` array (empty) with an `excerpt` field, and renders a `.post-excerpt` paragraph. Both are removed.

- [ ] **Step 1: Replace `src/pages/writing.astro` with the collection-driven version**

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';

const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

const posts = (await getCollection('writing', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---

<Layout title="Writing — Stanley Pang" description="Writing by Stanley Pang.">
  <header class="page-header">
    <h1 class="page-title">Writing</h1>
    {posts.length > 0 && (
      <p class="page-sub">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
    )}
  </header>

  <hr class="rule" />

  {posts.length === 0 ? (
    <p class="empty">Nothing here yet.</p>
  ) : (
    <ul class="index-list">
      {posts.map((post, i) => (
        <li class="post-item">
          <span class="index-num">
            {String(i + 1).padStart(2, '0')}
          </span>

          <div class="entry">
            <a href={`/writing/${post.id.replace(/\.mdx?$/, '')}`} class="post-title">
              {post.data.title}
            </a>
            <span class="entry-meta">{fmt.format(post.data.date)}</span>
          </div>
        </li>
      ))}
    </ul>
  )}
</Layout>

<style>
  .page-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .page-title {
    font-family: var(--font-display);
    font-weight: 300;
    font-optical-sizing: auto;
    font-size: var(--text-lg);
    letter-spacing: -0.01em;
  }

  .page-sub {
    font-size: var(--text-xs);
    color: var(--muted);
  }

  .post-item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .post-title {
    font-size: var(--text-sm);
    font-weight: 300;
    transition: color 200ms, padding-left 400ms cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-block;
  }
  .post-title:hover {
    color: var(--muted);
    padding-left: 0.25rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .post-title {
      transition: color 200ms;
    }
  }
</style>
```

- [ ] **Step 2: Verify the index shows the sample post**

```bash
pnpm dev
```

Open `http://localhost:4321/writing`. Expected:
- "01" index number with "Hello, World" title linked to `/writing/hello-world`
- "Mar 2026" date
- "1 post" count in the header
- No excerpt paragraph

Kill with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/pages/writing.astro
git commit -m "feat: wire writing index to content collection"
```

---

## Task 5: Add prose styles to global CSS

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Append the `.prose` block to `src/styles/global.css`**

Add at the end of the file:

```css
/* ── Prose (blog post body) ────────────────────────────────── */
.prose p {
  line-height: 1.85;
  max-width: 65ch;
  margin-bottom: 1.4em;
}

.prose h2 {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--text-lg);
  letter-spacing: -0.01em;
  margin-top: 2.5em;
  margin-bottom: 0.5em;
}

.prose h3 {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--text-base);
  margin-top: 2em;
  margin-bottom: 0.4em;
}

.prose blockquote {
  border-left: 2px solid var(--border);
  padding-left: 1rem;
  color: var(--muted);
  margin-block: 1.5em;
}

.prose code:not(pre code) {
  font-family: monospace;
  font-size: var(--text-xs);
  background: color-mix(in oklch, var(--border) 60%, transparent);
  padding: 0.1em 0.3em;
  border-radius: 2px;
}

.prose pre {
  font-family: monospace;
  font-size: var(--text-xs);
  background: oklch(14% 0.003 260);
  color: oklch(90% 0.004 80);
  overflow-x: auto;
  padding: 1.25rem;
  margin-block: 1.75em;
  border-radius: 2px;
}

.prose pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

.prose img {
  max-width: 100%;
  margin-block: 2rem;
}

.prose figure {
  margin-block: 2rem;
}

.prose figcaption {
  font-size: var(--text-2xs);
  color: var(--muted);
  margin-top: 0.5rem;
  text-align: center;
}

.prose a {
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 200ms;
}
.prose a:hover {
  color: var(--muted);
}

.prose ul,
.prose ol {
  padding-left: 1.4rem;
  margin-bottom: 1.2em;
}

.prose li {
  margin-bottom: 0.4em;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add prose typography styles"
```

---

## Task 6: Create the post page

**Files:**
- Create: `src/pages/writing/[slug].astro`

- [ ] **Step 1: Create `src/pages/writing/[slug].astro`**

First create the directory:

```bash
mkdir -p src/pages/writing
```

Then create the file:

```astro
---
import { getCollection, render } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('writing', ({ data }) => !data.draft);
  return posts.map(entry => ({
    params: { slug: entry.id.replace(/\.mdx?$/, '') },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);

const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
---

<Layout title={`${entry.data.title} — Stanley Pang`} description={entry.data.title}>
  <header class="post-header">
    <h1 class="post-title">{entry.data.title}</h1>
    <p class="post-date">{fmt.format(entry.data.date)}</p>
  </header>

  <hr class="rule" />

  <div class="prose">
    <Content />
  </div>

  <hr class="rule" />

  <a href="/writing" class="back-link">← Writing</a>
</Layout>

<style>
  .post-header {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .post-title {
    font-family: var(--font-display);
    font-weight: 300;
    font-optical-sizing: auto;
    font-size: var(--text-lg);
    letter-spacing: -0.01em;
    line-height: 1.25;
  }

  .post-date {
    font-size: var(--text-xs);
    color: var(--muted);
  }

  .back-link {
    font-size: var(--text-xs);
    color: var(--muted);
    display: inline-block;
    transition: color 200ms, padding-left 400ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .back-link:hover {
    color: var(--fg);
    padding-left: 0.25rem;
  }
</style>
```

- [ ] **Step 2: Verify the post page renders**

```bash
pnpm dev
```

Open `http://localhost:4321/writing/hello-world`. Expected:
- Title "Hello, World" in Fraunces display font
- Date "Mar 2026" in muted text below
- Horizontal rule
- Post body with the heading "A heading" and paragraph text
- Horizontal rule
- "← Writing" back-link at the bottom

Kill with Ctrl+C.

- [ ] **Step 3: Verify the back-link works**

Click "← Writing" — should navigate to `/writing`. Click "Hello, World" — should return to the post.

- [ ] **Step 4: Verify prose styles by inspecting the sample post**

In the browser, check that:
- The heading `## A heading` renders in Fraunces with `--text-lg` sizing
- The paragraph text has generous line-height (visually airy)
- Both light and dark modes look correct (toggle with the circle button in the nav)

- [ ] **Step 5: Verify draft exclusion works**

Add `draft: true` to `src/content/writing/hello-world.md` frontmatter and save. The dev server hot-reloads content automatically — no restart needed.

Open `http://localhost:4321/writing`. Expected: "Nothing here yet." (empty state). Open `http://localhost:4321/writing/hello-world`. Expected: 404 page (route not generated).

Remove `draft: true` (or set to `false`) and save. Confirm the post reappears at `/writing` without restarting the server.

- [ ] **Step 6: Commit**

```bash
git add src/pages/writing/[slug].astro
git commit -m "feat: add dynamic post page with prose layout"
```

---

## Task 7: Verify static build

**Files:** None (verification only)

- [ ] **Step 1: Run the production build**

```bash
pnpm build
```

Expected: Build completes with no errors. Output should include a line like:
```
▶ src/pages/writing/[slug].astro
  └─ /writing/hello-world/index.html
```

- [ ] **Step 2: Preview the built output**

```bash
pnpm preview
```

Open `http://localhost:4321/writing` and navigate to the post. Verify everything looks correct in the built output (not just dev mode). Kill with Ctrl+C.

- [ ] **Step 3: Done**

The system is complete. To add a new blog post in future:

1. Create `src/content/writing/my-post-slug.md`
2. Add frontmatter: `title`, `date`
3. Write content below the `---` delimiter
4. Commit and push — Vercel builds and deploys automatically

To write a draft without publishing: add `draft: true` to frontmatter.
