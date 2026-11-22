/**
 * Workspace layout model: which panes are shown, in what order and how wide.
 *
 * Pure data and pure functions only. React bindings live in `../hooks`, persistence in
 * `./layout-cookie`.
 */

export const PANE_IDS = ["markdown", "latex", "preview"] as const;

export type PaneId = (typeof PANE_IDS)[number];

export type MoveDirection = "left" | "right";

export interface WorkspaceLayout {
  /** Left-to-right order of every pane, visible or not. */
  readonly order: readonly PaneId[];
  /** Panes currently shown side by side, in display order. Never empty. */
  readonly visible: readonly PaneId[];
  /** Relative width of each pane. Only the ratio between visible panes matters. */
  readonly weights: Readonly<Record<PaneId, number>>;
  /** The pane shown on screens too narrow for a split view. */
  readonly active: PaneId;
}

export type LayoutAction =
  | { type: "toggle"; pane: PaneId }
  | { type: "solo"; pane: PaneId }
  | { type: "activate"; pane: PaneId }
  | { type: "move"; pane: PaneId; direction: MoveDirection }
  | { type: "resize"; sizes: Readonly<Partial<Record<PaneId, number>>> }
  | { type: "showAll" }
  | { type: "reset" };

export const DEFAULT_LAYOUT: WorkspaceLayout = {
  order: PANE_IDS,
  visible: PANE_IDS,
  weights: { markdown: 34, latex: 30, preview: 36 },
  active: "markdown",
};

/** Smallest share of the split view a pane may be resized to, in percent. */
export const MIN_PANE_PERCENT = 15;

const WEIGHT_EPSILON = 0.05;

export function isPaneId(value: unknown): value is PaneId {
  return typeof value === "string" && (PANE_IDS as readonly string[]).includes(value);
}

/** Width of each visible pane as a percentage of the split view. Sums to 100. */
export function paneShares(layout: WorkspaceLayout): Partial<Record<PaneId, number>> {
  const panes = layout.visible;
  const total = panes.reduce((sum, pane) => sum + layout.weights[pane], 0);
  const shares: Partial<Record<PaneId, number>> = {};
  for (const pane of panes) {
    shares[pane] = (layout.weights[pane] / total) * 100;
  }
  return shares;
}

/** The visible pane sitting next to `pane` in the given direction, if any. */
export function neighbourOf(
  layout: WorkspaceLayout,
  pane: PaneId,
  direction: MoveDirection,
): PaneId | undefined {
  const index = layout.visible.indexOf(pane);
  if (index === -1) return undefined;
  return layout.visible[direction === "left" ? index - 1 : index + 1];
}

function withVisible(
  layout: WorkspaceLayout,
  visible: readonly PaneId[],
): WorkspaceLayout {
  const ordered = layout.order.filter((pane) => visible.includes(pane));
  const first = ordered[0];
  if (first === undefined) return layout;
  const active = ordered.includes(layout.active) ? layout.active : first;
  return { ...layout, visible: ordered, active };
}

function toggle(layout: WorkspaceLayout, pane: PaneId): WorkspaceLayout {
  if (!layout.visible.includes(pane)) {
    return withVisible(layout, [...layout.visible, pane]);
  }
  // The last pane standing cannot be hidden: the workspace is never empty.
  if (layout.visible.length === 1) return layout;
  return withVisible(
    layout,
    layout.visible.filter((id) => id !== pane),
  );
}

function activate(layout: WorkspaceLayout, pane: PaneId): WorkspaceLayout {
  if (layout.active === pane && layout.visible.includes(pane)) return layout;
  const visible = layout.visible.includes(pane)
    ? layout.visible
    : [...layout.visible, pane];
  return { ...withVisible(layout, visible), active: pane };
}

function move(
  layout: WorkspaceLayout,
  pane: PaneId,
  direction: MoveDirection,
): WorkspaceLayout {
  const neighbour = neighbourOf(layout, pane, direction);
  if (neighbour === undefined) return layout;
  const order = layout.order.map((id) => {
    if (id === pane) return neighbour;
    if (id === neighbour) return pane;
    return id;
  });
  return { ...layout, order, visible: order.filter((id) => layout.visible.includes(id)) };
}

function resize(
  layout: WorkspaceLayout,
  sizes: Readonly<Partial<Record<PaneId, number>>>,
): WorkspaceLayout {
  const panes = layout.visible;
  const percents = panes.map((pane) => sizes[pane]);
  if (percents.some((value) => value === undefined || !(value > 0))) return layout;

  // Rescale so hidden panes keep a width comparable to the visible ones.
  const totalWeight = panes.reduce((sum, pane) => sum + layout.weights[pane], 0);
  const totalPercent = percents.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const weights = { ...layout.weights };
  let changed = false;
  panes.forEach((pane, index) => {
    const next = ((percents[index] ?? 0) / totalPercent) * totalWeight;
    if (Math.abs(next - layout.weights[pane]) > WEIGHT_EPSILON) changed = true;
    weights[pane] = next;
  });
  return changed ? { ...layout, weights } : layout;
}

/**
 * Applies an action to a layout. Returns the same object when nothing changes, so
 * callers can rely on identity to skip work.
 */
export function layoutReducer(
  layout: WorkspaceLayout,
  action: LayoutAction,
): WorkspaceLayout {
  switch (action.type) {
    case "toggle":
      return toggle(layout, action.pane);
    case "solo":
      return { ...layout, visible: [action.pane], active: action.pane };
    case "activate":
      return activate(layout, action.pane);
    case "move":
      return move(layout, action.pane, action.direction);
    case "resize":
      return resize(layout, action.sizes);
    case "showAll":
      return layout.visible.length === PANE_IDS.length
        ? layout
        : withVisible(layout, PANE_IDS);
    case "reset":
      return DEFAULT_LAYOUT;
  }
}
