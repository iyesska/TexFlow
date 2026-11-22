import Link from "next/link";

import { FullPageMessage } from "@/components/feedback/full-page-message";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <FullPageMessage
      title="Esta página no existe"
      description="La dirección puede estar mal escrita o el documento ya no está disponible."
      action={
        <Button asChild>
          <Link href="/documents">Ir a tus documentos</Link>
        </Button>
      }
    />
  );
}
