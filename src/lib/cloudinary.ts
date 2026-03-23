export type CloudinaryResource = {
  public_id: string;
  created_at: string;
  context?: { alt?: string; caption?: string };
};

export type Photo = {
  src: string;
  alt: string;
  date: string;
  caption?: string;
};

export function mapResource(cloudName: string, resource: CloudinaryResource): Photo {
  return {
    src: `https://res.cloudinary.com/${cloudName}/image/upload/w_1200,f_auto,q_auto/${resource.public_id}`,
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
