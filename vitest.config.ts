// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Note: Vitest shims `import.meta.env` as `{}` in node environment.
    // spotify-token.ts references import.meta.env inside GET() but tests
    // call getSpotifyClientToken() directly (which takes args), so no
    // additional env configuration is needed.
  },
});
