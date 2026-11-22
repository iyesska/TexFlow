import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";

interface FullPageMessageProps {
  readonly title: string;
  readonly description: string;
  /** The way out: a retry button or a link back. */
  readonly action: ReactNode;
}

/** A whole-screen message for when there is no workspace to show. */
export function FullPageMessage({ title, description, action }: FullPageMessageProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark className="text-[1.5rem]" />
      <h1 className="mt-8 text-lg font-semibold text-balance">{title}</h1>
      <p className="mt-2 max-w-[44ch] text-sm text-pretty text-muted-foreground">
        {description}
      </p>
      <div className="mt-6">{action}</div>
    </main>
  );
}
