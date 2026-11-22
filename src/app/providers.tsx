import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={350} skipDelayDuration={200}>
        {children}
      </TooltipProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
