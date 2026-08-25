export function getFontScaledListHeight(
  baseHeight: number,
  fontScale: number,
): number {
  const safeBaseHeight = Number.isFinite(baseHeight) ? Math.max(0, baseHeight) : 0;
  const safeFontScale = Number.isFinite(fontScale) ? Math.max(1, fontScale) : 1;

  return Math.ceil(safeBaseHeight * safeFontScale);
}
