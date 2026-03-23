import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

describe('getArtistImage', () => {
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
          }],
        },
      }),
    });

    const { getArtistImage } = await import('./spotify');
    const result = await getArtistImage('Radiohead', 'tok');
    expect(result).toBe('https://img/300.jpg');
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
          }],
        },
      }),
    });

    const { getArtistImage } = await import('./spotify');
    const result = await getArtistImage('Tiny', 'tok');
    // sorted ascending: [50px, 100px]; last entry = 100px (largest available)
    expect(result).toBe('https://img/100.jpg');
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
          }],
        },
      }),
    });

    const { getArtistImage } = await import('./spotify');
    const result = await getArtistImage('Artist', 'tok');
    expect(result).toBe('https://img/b.jpg');
  });

  it('returns null when artist not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    });
    const { getArtistImage } = await import('./spotify');
    expect(await getArtistImage('Ghost', 'tok')).toBeNull();
  });

  it('returns null on HTTP 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    const { getArtistImage } = await import('./spotify');
    expect(await getArtistImage('X', 'tok')).toBeNull();
  });

  it('returns null when images array is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artists: { items: [{ name: 'Y', images: [] }] },
      }),
    });
    const { getArtistImage } = await import('./spotify');
    expect(await getArtistImage('Y', 'tok')).toBeNull();
  });

  it('URL-encodes the artist name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    });
    const { getArtistImage } = await import('./spotify');
    await getArtistImage('AC/DC', 'tok');
    const called = mockFetch.mock.calls[0][0] as string;
    expect(called).toContain('AC%2FDC');
  });
});
