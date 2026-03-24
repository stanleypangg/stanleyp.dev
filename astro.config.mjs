import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  site: 'https://stanleyp.dev',
  adapter: vercel(),
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/chat') })],
});
