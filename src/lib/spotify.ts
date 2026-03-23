interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export async function getArtistImage(
  artistName: string,
  accessToken: string,
): Promise<string | null> {
  const encoded = encodeURIComponent(artistName);
  const url = `https://api.spotify.com/v1/search?q=${encoded}&type=artist&limit=1`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data = await res.json();
  const items: Array<{ images: SpotifyImage[] }> = data?.artists?.items ?? [];
  if (items.length === 0) return null;

  const images = items[0].images;
  if (images.length === 0) return null;

  // Sort ascending by width (null treated as 0)
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));

  // Find the smallest image at or above 300px
  const target = sorted.find((img) => (img.width ?? 0) >= 300);

  // Fall back to the last (largest available) if none qualifies
  return (target ?? sorted[sorted.length - 1]).url;
}
