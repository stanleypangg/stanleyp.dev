import { describe, it, expect } from 'vitest';
import { mapResource, sortNewestFirst } from './cloudinary';

const baseResource = {
  public_id: 'pictures/my-photo',
  created_at: '2025-04-15T10:00:00Z',
  width: 1200,
  height: 800,
};

describe('mapResource', () => {
  it('builds the correct Cloudinary URL with optimization params', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.src).toBe(
      'https://res.cloudinary.com/mycloud/image/upload/w_1200,f_auto,q_auto/pictures/my-photo'
    );
  });

  it('builds a srcset with 400w, 800w, 1200w variants', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.srcset).toBe(
      'https://res.cloudinary.com/mycloud/image/upload/w_400,f_auto,q_auto/pictures/my-photo 400w, ' +
      'https://res.cloudinary.com/mycloud/image/upload/w_800,f_auto,q_auto/pictures/my-photo 800w, ' +
      'https://res.cloudinary.com/mycloud/image/upload/w_1200,f_auto,q_auto/pictures/my-photo 1200w'
    );
  });

  it('preserves width and height from the resource', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.width).toBe(1200);
    expect(photo.height).toBe(800);
  });

  it('formats date as "Mon YYYY"', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.date).toBe('Apr 2025');
  });

  it('defaults alt to empty string when context is absent', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.alt).toBe('');
  });

  it('reads alt from context.alt when present', () => {
    const photo = mapResource('mycloud', { ...baseResource, context: { alt: 'A sunset' } });
    expect(photo.alt).toBe('A sunset');
  });

  it('reads caption from context.caption when present', () => {
    const photo = mapResource('mycloud', { ...baseResource, context: { caption: 'Rome, 2025' } });
    expect(photo.caption).toBe('Rome, 2025');
  });

  it('omits caption when context is absent', () => {
    const photo = mapResource('mycloud', baseResource);
    expect(photo.caption).toBeUndefined();
  });
});

describe('sortNewestFirst', () => {
  it('sorts resources newest-first by created_at', () => {
    const resources = [
      { ...baseResource, created_at: '2025-01-01T00:00:00Z' },
      { ...baseResource, created_at: '2025-06-01T00:00:00Z' },
      { ...baseResource, created_at: '2025-03-01T00:00:00Z' },
    ];
    const sorted = sortNewestFirst(resources);
    expect(sorted[0].created_at).toBe('2025-06-01T00:00:00Z');
    expect(sorted[1].created_at).toBe('2025-03-01T00:00:00Z');
    expect(sorted[2].created_at).toBe('2025-01-01T00:00:00Z');
  });
});
