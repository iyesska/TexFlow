import { Wordmark } from "@/components/brand/wordmark";
import { Skeleton } from "@/components/ui/skeleton";

import { DEFAULT_LAYOUT, PANE_IDS } from "../model/layout";
import { PaneFrame } from "./pane-frame";

/** Shown while the workspace reads the saved layout. Mirrors the default layout. */
export function WorkspaceSkeleton() {
  return (
    <div
      className="flex h-dvh flex-col"
      aria-busy="true"
      aria-label="Cargando el espacio de trabajo"
    >
      {/* As tall as the top bar: two rows until the pane switcher fits beside it. */}
      <div className="flex h-22.5 shrink-0 items-start px-3 pt-3 xl:h-12 xl:items-center xl:pt-0">
        <Wordmark />
      </div>
      <div className="flex min-h-0 flex-1 gap-1.5 px-1.5 pb-1.5">
        {PANE_IDS.map((pane, index) => (
          <div
            key={pane}
            className={index === 0 ? "min-w-0" : "hidden min-w-0 md:block"}
            style={{ flexGrow: DEFAULT_LAYOUT.weights[pane], flexBasis: 0 }}
          >
            <PaneFrame header={<Skeleton className="h-3.5 w-24" />}>
              <div className="space-y-3 p-4">
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </PaneFrame>
          </div>
        ))}
      </div>
    </div>
  );
}
