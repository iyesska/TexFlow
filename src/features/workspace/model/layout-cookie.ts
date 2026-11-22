import { z } from "zod";

import { DEFAULT_LAYOUT, PANE_IDS, type WorkspaceLayout } from "./layout";

/**
 * The layout is kept in a cookie rather than localStorage so the server can render the
 * workspace with the right panes on the first paint.
 */
export const LAYOUT_COOKIE = "texflow_layout";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const paneId = z.enum(PANE_IDS);
const weight = z.number().finite().positive().max(1000);

const layoutSchema = z
  .object({
    order: z.array(paneId).length(PANE_IDS.length),
    visible: z.array(paneId).min(1).max(PANE_IDS.length),
    weights: z.object({ markdown: weight, latex: weight, preview: weight }),
    active: paneId,
  })
  .refine((layout) => new Set(layout.order).size === PANE_IDS.length)
  .refine((layout) => new Set(layout.visible).size === layout.visible.length)
  .refine((layout) => layout.visible.includes(layout.active));

export function serializeLayout(layout: WorkspaceLayout): string {
  return encodeURIComponent(JSON.stringify(layout));
}

/**
 * Reads a layout from a raw cookie value. Cookies are user-controlled input, so
 * anything that does not validate falls back to the default layout.
 */
export function parseLayout(raw: string | undefined): WorkspaceLayout {
  if (!raw) return DEFAULT_LAYOUT;
  let json: unknown;
  try {
    json = JSON.parse(decodeURIComponent(raw));
  } catch {
    return DEFAULT_LAYOUT;
  }
  const result = layoutSchema.safeParse(json);
  if (!result.success) return DEFAULT_LAYOUT;
  const { order, visible, weights, active } = result.data;
  return {
    order,
    visible: order.filter((pane) => visible.includes(pane)),
    weights,
    active,
  };
}

export function layoutCookieString(layout: WorkspaceLayout): string {
  return `${LAYOUT_COOKIE}=${serializeLayout(layout)}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
}
