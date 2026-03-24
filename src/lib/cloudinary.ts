export type CloudinaryResource = {
  public_id: string;
  created_at: string;
  width: number;
  height: number;
  context?: { alt?: string; caption?: string };
};

export type Photo = {
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  date: string;
  caption?: string;
};

const SRCSET_WIDTHS = [400, 800, 1200] as const;
const BASE_URL = (cloudName: string) =>
  `https://res.cloudinary.com/${cloudName}/image/upload`;

export function mapResource(cloudName: string, resource: CloudinaryResource): Photo {
  const base = BASE_URL(cloudName);
  const id = resource.public_id;
  return {
    src: `${base}/w_1200,f_auto,q_auto/${id}`,
    srcset: SRCSET_WIDTHS.map(w => `${base}/w_${w},f_auto,q_auto/${id} ${w}w`).join(', '),
    width: resource.width,
    height: resource.height,
    alt: resource.context?.alt ?? '',
    date: new Date(resource.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    caption: resource.context?.caption,
  };
}

export function sortNewestFirst(resources: CloudinaryResource[]): CloudinaryResource[] {
  return [...resources].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
