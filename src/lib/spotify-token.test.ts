import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test `getSpotifyClientToken` directly — it accepts credentials as
// arguments, so no import.meta.env stubbing is needed.
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

describe('getSpotifyClientToken', () => {
  it('returns access token from Spotify', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok_abc', expires_in: 3600 }),
    });

    const { getSpotifyClientToken } = await import('../pages/api/spotify-token');
    const res = await getSpotifyClientToken('cid', 'csec');
    const body = await res.json();

    expect(body).toEqual({ access_token: 'tok_abc', expires_in: 3600 });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3500');

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('https://accounts.spotify.com/api/token');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers.Authorization).toBe(`Basic ${btoa('cid:csec')}`);
  });

  it('returns 500 when credentials are missing', async () => {
    const { getSpotifyClientToken } = await import('../pages/api/spotify-token');
    const res = await getSpotifyClientToken('', '');
    expect(res.status).toBe(500);
  });

  it('returns 502 when Spotify responds with an error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    const { getSpotifyClientToken } = await import('../pages/api/spotify-token');
    const res = await getSpotifyClientToken('cid', 'csec');
    expect(res.status).toBe(502);
  });
});
