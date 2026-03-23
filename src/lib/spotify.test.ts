import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

describe('getArtistData', () => {
  it('returns the smallest image at or above 300px width', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: {
          items: [{
            name: 'Radiohead',
            images: [
              { url: 'https://img/640.jpg', width: 640, height: 640 },
              { url: 'https://img/300.jpg', width: 300, height: 300 },
              { url: 'https://img/64.jpg',  width: 64,  height: 64  },
            ],
            external_urls: { spotify: 'https://open.spotify.com/artist/test' },
          }],
        },
      }),
    });

    const { getArtistData } = await import('./spotify');
    const result = await getArtistData('Radiohead', 'tok');
    expect(result.imageUrl).toBe('https://img/300.jpg');
    expect(result.spotifyUrl).toBe('https://open.spotify.com/artist/test');
  });

  it('falls back to the largest available image when none is >= 300px', async () => {
    // sorted ascending: [50, 100] → none >= 300 → fallback = last = 100px
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: {
          items: [{
            name: 'Tiny',
            images: [
              { url: 'https://img/100.jpg', width: 100, height: 100 },
              { url: 'https://img/50.jpg',  width: 50,  height: 50  },
            ],
            external_urls: { spotify: 'https://open.spotify.com/artist/tiny' },
          }],
        },
      }),
    });

    const { getArtistData } = await import('./spotify');
    const result = await getArtistData('Tiny', 'tok');
    // sorted ascending: [50px, 100px]; last entry = 100px (largest available)
    expect(result.imageUrl).toBe('https://img/100.jpg');
    expect(result.spotifyUrl).toBe('https://open.spotify.com/artist/tiny');
  });

  it('handles null width entries by treating them as 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: {
          items: [{
            name: 'Artist',
            images: [
              { url: 'https://img/a.jpg', width: null, height: null },
              { url: 'https://img/b.jpg', width: 300,  height: 300  },
            ],
            external_urls: { spotify: 'https://open.spotify.com/artist/artist' },
          }],
        },
      }),
    });

    const { getArtistData } = await import('./spotify');
    const result = await getArtistData('Artist', 'tok');
    expect(result.imageUrl).toBe('https://img/b.jpg');
    expect(result.spotifyUrl).toBe('https://open.spotify.com/artist/artist');
  });

  it('returns null fields when artist not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    });
    const { getArtistData } = await import('./spotify');
    expect(await getArtistData('Ghost', 'tok')).toEqual({ imageUrl: null, spotifyUrl: null });
  });

  it('returns null fields on HTTP 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    const { getArtistData } = await import('./spotify');
    expect(await getArtistData('X', 'tok')).toEqual({ imageUrl: null, spotifyUrl: null });
  });

  it('returns null imageUrl but spotifyUrl when images array is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: { items: [{ name: 'Y', images: [], external_urls: { spotify: 'https://open.spotify.com/artist/y' } }] },
      }),
    });
    const { getArtistData } = await import('./spotify');
    const result = await getArtistData('Y', 'tok');
    expect(result.imageUrl).toBeNull();
    expect(result.spotifyUrl).toBe('https://open.spotify.com/artist/y');
  });

  it('URL-encodes the artist name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    });
    const { getArtistData } = await import('./spotify');
    await getArtistData('AC/DC', 'tok');
    const called = mockFetch.mock.calls[0][0] as string;
    expect(called).toContain('AC%2FDC');
  });

  it('returns null fields when response body is not valid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });
    const { getArtistData } = await import('./spotify');
    expect(await getArtistData('Artist', 'tok')).toEqual({ imageUrl: null, spotifyUrl: null });
  });
});
