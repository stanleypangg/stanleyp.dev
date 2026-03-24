import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional().default(false),
    description: z.string().optional(),
    updated: z.coerce.date().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    year: z.string(),
    order: z.number(),
    award: z.string().optional(),
    description: z.string(),
    stack: z.array(z.string()),
    links: z.object({
      github: z.string().url().optional(),
      live: z.string().url().optional(),
      devpost: z.string().url().optional(),
    }),
  }),
});

export const collections = { writing, projects };
