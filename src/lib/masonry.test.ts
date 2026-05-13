import { describe, expect, it } from 'vitest';
import photoOrder from '../data/photo-order.json';
import { getMasonryColumnIndexes, getMasonryColumns } from './masonry';

describe('masonry helpers', () => {
  it('assigns the first pictures by shortest projected column', () => {
    const photos = photoOrder
      .filter((photo): photo is { id: string; w: number; h: number } => (
        typeof photo === 'object' && 'w' in photo
      ))
      .slice(0, 12)
      .map((photo) => ({ width: photo.w, height: photo.h }));

    expect(getMasonryColumnIndexes(photos)).toEqual([0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0]);
  });

  it('returns photos grouped by their assigned column', () => {
    const photos = [
      { id: 'wide', width: 4, height: 3 },
      { id: 'tall', width: 3, height: 4 },
      { id: 'square', width: 1, height: 1 },
    ];

    expect(getMasonryColumns(photos)).toEqual([
      [photos[0], photos[2]],
      [photos[1]],
    ]);
  });
});
