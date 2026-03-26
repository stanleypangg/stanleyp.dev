# stanleyp.dev

Personal portfolio at [stanleyp.dev](https://stanleyp.dev). Built with Astro, deployed on Vercel.

## Stack

- **Astro 5** — static-first, zero unnecessary JS
- **Vercel** — edge deployment with SSR for dynamic routes
- **Supabase** — PostgreSQL + Realtime for chat and view counts
- **Spotify API** — now-playing widget and artist images
- **Last.fm API** — listening history and top charts
- **Cloudinary** — photo gallery

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — bio, work history, now-playing widget |
| `/projects` | Selected work with stack and links |
| `/writing` | Articles |
| `/music` | Top artists, albums, tracks, recent plays |
| `/pictures` | Photo gallery (Cloudinary) |
| `/chat` | Real-time chat room |

## API Routes

| Endpoint | Purpose |
|----------|---------|
| `GET /api/now-playing` | Current or recently played Spotify track |
| `GET /api/artist-images` | Batch artist images from Spotify; CDN-cached 1h |
| `GET /api/chat` | Last 50 chat messages |
| `POST /api/chat` | Submit message (rate-limited, content-filtered) |

## Environment Variables

```bash
# Supabase
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=

# Last.fm
PUBLIC_LASTFM_API_KEY=
PUBLIC_LASTFM_USERNAME=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Chat
IP_SALT=                  # Random string for IP hashing
BLOCKED_WORDS=            # Comma-separated list
```

### Getting a Spotify Refresh Token

1. Create an app at [developer.spotify.com](https://developer.spotify.com)
2. Set redirect URI to `http://localhost:8888/callback`
3. Authorize: `https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost:8888/callback&scope=user-read-currently-playing,user-read-recently-played`
4. Exchange the `code` for tokens via `POST https://accounts.spotify.com/api/token`

## Development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build
npm run preview
npm test
```

## Design

Typographic, monochromatic, editorial. Two first-class modes: light reads like a printed page, dark reads like an editor at night. No decorative elements — type, spacing, and weight carry all hierarchy.

Colors: near-black `oklch(12% 0 0)`, warm off-white `oklch(97% 0.005 80)`.
Typefaces: Fraunces (display) + DM Sans (body) — both variable.
