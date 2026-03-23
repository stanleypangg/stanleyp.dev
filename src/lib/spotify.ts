interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ArtistData {
  imageUrl: string | null;
  spotifyUrl: string | null;
}

export async function getArtistData(
  artistName: string,
  accessToken: string,
): Promise<ArtistData> {
  const encoded = encodeURIComponent(artistName);
  const url = `https://api.spotify.com/v1/search?q=${encoded}&type=artist&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return { imageUrl: null, spotifyUrl: null };

    const data = await res.json();
    const items: Array<{ images: SpotifyImage[]; external_urls: { spotify: string } }> =
      data?.artists?.items ?? [];
    if (items.length === 0) return { imageUrl: null, spotifyUrl: null };

    const images = items[0].images;
    const spotifyUrl = items[0].external_urls?.spotify ?? null;

    if (images.length === 0) return { imageUrl: null, spotifyUrl };

    const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
    const target = sorted.find((img) => (img.width ?? 0) >= 300);

    return { imageUrl: (target ?? sorted[sorted.length - 1]).url, spotifyUrl };
  } catch {
    return { imageUrl: null, spotifyUrl: null };
  }
}
