import { describe, it, expect, vi, beforeEach } from 'vitest';

// lastfm.ts receives apiKey and user as function arguments,
// so no import.meta.env stubbing is needed here.
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const API_KEY = 'test_key';
const USERNAME = 'test_user';

describe('getTopArtists', () => {
  it('returns parsed artist stats', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topartists: {
          artist: [
            { name: 'Radiohead', playcount: '42', url: 'https://last.fm/Radiohead' },
          ],
        },
      }),
    });

    const { getTopArtists } = await import('./lastfm');
    const result = await getTopArtists('7day', 10, API_KEY, USERNAME);

    expect(result).toEqual([
      { name: 'Radiohead', playcount: 42, url: 'https://last.fm/Radiohead' },
    ]);

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get('method')).toBe('user.gettopartists');
    expect(url.searchParams.get('period')).toBe('7day');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('user')).toBe(USERNAME);
    expect(url.searchParams.get('api_key')).toBe(API_KEY);
    expect(url.searchParams.get('format')).toBe('json');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const { getTopArtists } = await import('./lastfm');
    await expect(getTopArtists('7day', 10, API_KEY, USERNAME)).rejects.toThrow();
  });
});

describe('getTopAlbums', () => {
  it('returns parsed album stats with image', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topalbums: {
          album: [
            {
              name: 'OK Computer',
              artist: { name: 'Radiohead' },
              playcount: '20',
              url: 'https://last.fm/okcomputer',
              image: [
                { '#text': '', size: 'small' },
                { '#text': 'https://img/medium.jpg', size: 'medium' },
                { '#text': 'https://img/large.jpg', size: 'large' },
              ],
            },
          ],
        },
      }),
    });

    const { getTopAlbums } = await import('./lastfm');
    const result = await getTopAlbums('7day', 10, API_KEY, USERNAME);

    expect(result[0]).toMatchObject({
      name: 'OK Computer',
      artist: 'Radiohead',
      playcount: 20,
      imageUrl: 'https://img/medium.jpg',
    });
  });

  it('sets imageUrl to null when image text is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topalbums: {
          album: [
            {
              name: 'Album',
              artist: { name: 'Artist' },
              playcount: '1',
              url: 'https://last.fm/album',
              image: [{ '#text': '', size: 'medium' }],
            },
          ],
        },
      }),
    });

    const { getTopAlbums } = await import('./lastfm');
    const result = await getTopAlbums('7day', 10, API_KEY, USERNAME);
    expect(result[0].imageUrl).toBeNull();
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const { getTopAlbums } = await import('./lastfm');
    await expect(getTopAlbums('7day', 10, API_KEY, USERNAME)).rejects.toThrow();
  });
});

describe('getRecentTracks', () => {
  it('returns parsed tracks with timestamp', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Karma Police',
              artist: { '#text': 'Radiohead' },
              url: 'https://last.fm/karmapolice',
              date: { uts: '1700000000' },
            },
          ],
        },
      }),
    });

    const { getRecentTracks } = await import('./lastfm');
    const result = await getRecentTracks(10, API_KEY, USERNAME);

    expect(result[0]).toEqual({
      name: 'Karma Police',
      artist: 'Radiohead',
      url: 'https://last.fm/karmapolice',
      timestamp: 1700000000,
    });
  });

  it('sets timestamp to null for now-playing track', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Track',
              artist: { '#text': 'Artist' },
              url: 'https://last.fm/track',
              '@attr': { nowplaying: 'true' },
            },
          ],
        },
      }),
    });

    const { getRecentTracks } = await import('./lastfm');
    const result = await getRecentTracks(10, API_KEY, USERNAME);
    expect(result[0].timestamp).toBeNull();
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const { getRecentTracks } = await import('./lastfm');
    await expect(getRecentTracks(10, API_KEY, USERNAME)).rejects.toThrow();
  });
});

describe('getUserInfo', () => {
  it('returns playcount as number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { name: 'testuser', playcount: '12345' },
      }),
    });

    const { getUserInfo } = await import('./lastfm');
    const result = await getUserInfo(API_KEY, USERNAME);
    expect(result).toEqual({ name: 'testuser', playcount: 12345 });
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const { getUserInfo } = await import('./lastfm');
    await expect(getUserInfo(API_KEY, USERNAME)).rejects.toThrow();
  });
});
