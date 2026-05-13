export type MasonryPhoto = {
  width: number;
  height: number;
};

export function getMasonryColumns<T extends MasonryPhoto>(photos: T[], columnCount = 2): T[][] {
  const columns = Array.from({ length: columnCount }, () => [] as T[]);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  photos.forEach((photo) => {
    const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[columnIndex].push(photo);
    columnHeights[columnIndex] += photo.height / photo.width;
  });

  return columns;
}

export function getMasonryColumnIndexes(
  photos: MasonryPhoto[],
  columnCount = 2
): number[] {
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  return photos.map((photo) => {
    const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columnHeights[columnIndex] += photo.height / photo.width;
    return columnIndex;
  });
}
