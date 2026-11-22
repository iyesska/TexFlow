import { BookOpenText, Braces, PenLine, type LucideIcon } from "lucide-react";

import type { PaneId } from "../model/layout";

interface PaneMeta {
  readonly label: string;
  readonly icon: LucideIcon;
}

export const PANE_META: Readonly<Record<PaneId, PaneMeta>> = {
  markdown: { label: "Markdown", icon: PenLine },
  latex: { label: "LaTeX", icon: Braces },
  preview: { label: "Vista previa", icon: BookOpenText },
};
