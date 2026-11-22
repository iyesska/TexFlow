"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDocumentSession } from "@/features/document/hooks/use-document";

const LIBRARY = "/documents";

/** Back to the list of documents, once the open one is saved. */
export function BackToLibrary() {
  const session = useDocumentSession();
  const router = useRouter();

  const leave = async (event: MouseEvent<HTMLAnchorElement>) => {
    // Opening in a new tab leaves this one, and its unsaved work, where it is.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    await session.flush();
    if (session.getSnapshot().status === "saved") {
      router.push(LIBRARY);
      return;
    }
    toast.warning("Hay cambios sin guardar", {
      description: "Si sales ahora, se perderán los cambios que no se han guardado.",
      action: { label: "Salir igualmente", onClick: () => router.push(LIBRARY) },
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          asChild
          className="-ml-1 shrink-0 text-muted-foreground"
        >
          <Link href={LIBRARY} onClick={leave} aria-label="Tus documentos">
            <ChevronLeft />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        Tus documentos
      </TooltipContent>
    </Tooltip>
  );
}
