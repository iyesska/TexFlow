/** Width of an A4 sheet in CSS pixels (210 mm at 96 dpi). */
export const SHEET_WIDTH_PX = 794;

/** Space kept free around the sheet when it is fitted to the pane. */
const FIT_GUTTER_PX = 40;

export const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2] as const;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? 2;

/** "fit" follows the pane's width; a number is a fixed scale. */
export type ZoomSetting = "fit" | number;

/**
 * The scale at which a sheet exactly fills a pane of the given width.
 *
 * @param sheetWidth Width of the sheet at 100 %, in CSS pixels. A4 unless the
 * document on screen says otherwise.
 */
export function fitScale(paneWidth: number, sheetWidth = SHEET_WIDTH_PX): number {
  const scale = (paneWidth - FIT_GUTTER_PX) / sheetWidth;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

export function effectiveScale(
  setting: ZoomSetting,
  paneWidth: number,
  sheetWidth = SHEET_WIDTH_PX,
): number {
  return setting === "fit" ? fitScale(paneWidth, sheetWidth) : setting;
}

const TOLERANCE = 0.005;

/** The next fixed step above `scale`, or undefined at the top. */
export function zoomInFrom(scale: number): number | undefined {
  return ZOOM_STEPS.find((step) => step > scale + TOLERANCE);
}

/** The next fixed step below `scale`, or undefined at the bottom. */
export function zoomOutFrom(scale: number): number | undefined {
  return ZOOM_STEPS.findLast((step) => step < scale - TOLERANCE);
}

export function zoomLabel(scale: number): string {
  return `${Math.round(scale * 100)} %`;
}
