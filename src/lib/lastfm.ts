export type Period = '7day' | '1month' | 'overall';

export interface ArtistStat {
  name: string;
  playcount: number;
  url: string;
}

export interface AlbumStat {
  name: string;
  artist: string;
  playcount: number;
  url: string;
  imageUrl: string | null;
}

export interface Track {
  name: string;
  artist: string;
  url: string;
  timestamp: number | null;  // Unix timestamp, null means now-playing
}

export interface TrackStat {
  name: string;
  artist: string;
  playcount: number;
  url: string;
}

export interface UserInfo {
  name: string;
  playcount: number;
}

const BASE = 'https://ws.audioscrobbler.com/2.0/';

function buildUrl(params: Record<string, string>): string {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('format', 'json');
  return url.toString();
}

async function get<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(buildUrl(params));
  if (!res.ok) throw new Error(`Last.fm ${params.method} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getTopArtists(
  period: Period,
  limit: number,
  apiKey: string,
  user: string,
): Promise<ArtistStat[]> {
  const data = await get<{ topartists: { artist: Array<{ name: string; playcount: string; url: string }> } }>({
    method: 'user.gettopartists',
    user,
    api_key: apiKey,
    period,
    limit: String(limit),
  });
  return data.topartists.artist.map((a) => ({
    name: a.name,
    playcount: Number(a.playcount),
    url: a.url,
  }));
}

export async function getTopAlbums(
  period: Period,
  limit: number,
  apiKey: string,
  user: string,
): Promise<AlbumStat[]> {
  const data = await get<{
    topalbums: {
      album: Array<{
        name: string;
        artist: { name: string };
        playcount: string;
        url: string;
        image: Array<{ '#text': string; size: string }>;
      }>;
    };
  }>({
    method: 'user.gettopalbums',
    user,
    api_key: apiKey,
    period,
    limit: String(limit),
  });
  return data.topalbums.album.map((a) => {
    const img = a.image.find((i) => i.size === 'extralarge')
      ?? a.image.find((i) => i.size === 'large')
      ?? a.image.find((i) => i.size === 'medium');
    const imageUrl = img?.['#text'] || null;
    return {
      name: a.name,
      artist: a.artist.name,
      playcount: Number(a.playcount),
      url: a.url,
      imageUrl: imageUrl || null,
    };
  });
}

export async function getRecentTracks(
  limit: number,
  apiKey: string,
  user: string,
): Promise<Track[]> {
  const data = await get<{
    recenttracks: {
      track: Array<{
        name: string;
        artist: { '#text': string };
        url: string;
        date?: { uts: string };
        '@attr'?: { nowplaying: string };
      }>;
    };
  }>({
    method: 'user.getrecenttracks',
    user,
    api_key: apiKey,
    limit: String(limit),
  });
  return data.recenttracks.track.map((t) => ({
    name: t.name,
    artist: t.artist['#text'],
    url: t.url,
    timestamp: t.date ? Number(t.date.uts) : null,
  }));
}

export async function getTopTracks(
  period: Period,
  limit: number,
  apiKey: string,
  user: string,
): Promise<TrackStat[]> {
  const data = await get<{
    toptracks: {
      track: Array<{ name: string; artist: { name: string }; playcount: string; url: string }>;
    };
  }>({
    method: 'user.gettoptracks',
    user,
    api_key: apiKey,
    period,
    limit: String(limit),
  });
  return data.toptracks.track.map((t) => ({
    name: t.name,
    artist: t.artist.name,
    playcount: Number(t.playcount),
    url: t.url,
  }));
}

export async function getUserInfo(apiKey: string, user: string): Promise<UserInfo> {
  const data = await get<{ user: { name: string; playcount: string } }>({
    method: 'user.getinfo',
    user,
    api_key: apiKey,
  });
  return {
    name: data.user.name,
    playcount: Number(data.user.playcount),
  };
}
