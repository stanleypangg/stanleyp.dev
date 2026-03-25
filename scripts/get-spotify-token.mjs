/**
 * Run with: node scripts/get-spotify-token.mjs
 *
 * Prompts for your Spotify client credentials, opens the auth URL in your
 * browser, catches the callback, and prints your refresh token.
 */

import http from 'http';
import { execFile } from 'child_process';
import * as readline from 'readline/promises';

const PORT = 4321;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = 'user-read-currently-playing user-read-recently-played';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const clientId = await rl.question('Paste your Spotify Client ID: ');
const clientSecret = await rl.question('Paste your Spotify Client Secret: ');
rl.close();

// Build auth URL and open it
const authUrl =
  `https://accounts.spotify.com/authorize` +
  `?client_id=${clientId.trim()}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}`;

console.log('\nOpening Spotify in your browser — click Agree...\n');
const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
execFile(opener, [authUrl], () => {});

// Start a temporary server to catch the callback
const code = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    if (code) {
      res.end('<p>Got it! You can close this tab.</p>');
      server.close();
      resolve(code);
    } else {
      res.end(`<p>Error: ${error}</p>`);
      server.close();
      reject(new Error(error));
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Waiting for Spotify callback on port ${PORT}...`);
  });
});

// Exchange code for tokens
const basic = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

const res = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  }),
});

const data = await res.json();

if (data.error) {
  console.error('\nError:', data.error, data.error_description);
  process.exit(1);
}

console.log('\n✓ Success! Add these to your .env and Vercel environment variables:\n');
console.log(`SPOTIFY_CLIENT_ID=${clientId.trim()}`);
console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret.trim()}`);
console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`);
