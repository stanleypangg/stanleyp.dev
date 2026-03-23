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
  throw new Error('not implemented');
}

export function sortNewestFirst(resources: CloudinaryResource[]): CloudinaryResource[] {
  throw new Error('not implemented');
}
