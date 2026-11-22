import { Wordmark } from "@/components/brand/wordmark";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = ["w-2/5", "w-1/2", "w-1/3", "w-3/5", "w-2/5"];

/** Shown while the library reads the user's documents. Mirrors its layout. */
export function LibrarySkeleton() {
  return (
    <div
      className="flex min-h-dvh flex-col"
      aria-busy="true"
      aria-label="Cargando tus documentos"
    >
      <div className="flex h-14 shrink-0 items-center gap-4 border-b px-4 sm:px-6">
        <Wordmark />
        <div className="flex flex-1 justify-center">
          <Skeleton className="h-8 w-full max-w-sm" />
        </div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-6 sm:px-6 md:grid-cols-[13.5rem_minmax(0,1fr)] md:py-8">
        <div className="hidden gap-2 md:grid md:content-start">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
        <div className="grid content-start gap-3">
          <Skeleton className="h-5 w-48" />
          {ROWS.map((width, index) => (
            <div key={index} className="flex items-center gap-3.5 px-3 py-2.5">
              <Skeleton className="h-11 w-8" />
              <div className="grid flex-1 gap-2">
                <Skeleton className={`h-3.5 ${width}`} />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
