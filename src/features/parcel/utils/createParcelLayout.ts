const CREATE_PARCEL_ACTION_BAR_FALLBACK_HEIGHT = 96;

type CreateParcelContentPaddingInput = {
  measuredActionBarHeight: number;
  bottomInset: number;
  contentGap: number;
};

/**
 * Keeps scrollable content clear of the absolute action bar. The fallback is
 * used only for the first render; once onLayout reports the real height it
 * also covers font-scaled and wrapped summaries.
 */
export const resolveCreateParcelContentBottomPadding = ({
  measuredActionBarHeight,
  bottomInset,
  contentGap,
}: CreateParcelContentPaddingInput): number => {
  const safeMeasuredHeight = Number.isFinite(measuredActionBarHeight)
    ? Math.max(0, measuredActionBarHeight)
    : 0;
  const safeBottomInset = Number.isFinite(bottomInset)
    ? Math.max(0, bottomInset)
    : 0;
  const safeContentGap = Number.isFinite(contentGap) ? Math.max(0, contentGap) : 0;
  const actionBarHeight = safeMeasuredHeight > 0
    ? safeMeasuredHeight
    : CREATE_PARCEL_ACTION_BAR_FALLBACK_HEIGHT
      + Math.max(safeBottomInset, safeContentGap);

  return Math.ceil(actionBarHeight + safeContentGap);
};
