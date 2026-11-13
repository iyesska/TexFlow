import { LatexPane } from "@/features/latex-output/components/latex-pane";
import { MarkdownPane } from "@/features/editor/components/markdown-pane";
import { PaperSheet } from "@/features/preview/components/paper-sheet";
import { ShortcutKeys } from "@/components/shortcut-keys";
import { SHORTCUTS } from "@/config/shortcuts";

import type { PaneId } from "../model/layout";

/** Keyboard hint; hidden on narrow screens, where there is no split view to toggle. */
function ToggleHint({ pane }: { pane: PaneId }) {
  return (
    <p className="hidden items-center gap-2 text-xs text-faint-foreground md:flex">
      <ShortcutKeys combo={SHORTCUTS.togglePane[pane]} />
      muestra u oculta este panel
    </p>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="@container min-h-full bg-background px-5 py-6">
      <PaperSheet className="flex flex-col px-[12%] pt-[16%]">
        <h3 className="text-[clamp(1.125rem,5cqi,1.75rem)] leading-tight font-semibold text-balance">
          Vista previa
        </h3>
        <p className="mt-[0.8em] text-[clamp(0.8125rem,2.9cqi,1.0625rem)] leading-relaxed text-pretty text-ink-muted">
          El documento compuesto aparecerá en esta hoja, con sus fórmulas, tablas e
          imágenes. Llega en la fase 4.
        </p>
      </PaperSheet>
      <div className="mt-5 flex justify-center">
        <ToggleHint pane="preview" />
      </div>
    </div>
  );
}

const CONTENTS: Readonly<Record<PaneId, () => React.JSX.Element>> = {
  markdown: MarkdownPane,
  latex: LatexPane,
  preview: PreviewPlaceholder,
};

/**
 * What each pane shows. Until its feature lands, a pane explains what it is for; each
 * phase replaces one entry here with the real thing.
 */
export function PaneContent({ pane }: { pane: PaneId }) {
  const Content = CONTENTS[pane];
  return <Content />;
}
