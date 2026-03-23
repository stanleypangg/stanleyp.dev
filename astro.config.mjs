import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';

export default defineConfig({
  output: 'static',
  site: 'https://example.com',
  adapter: vercel(),
  integrations: [mdx()],
});
