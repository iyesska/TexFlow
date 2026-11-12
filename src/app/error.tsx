"use client";

import { useEffect } from "react";

import { FullPageMessage } from "@/components/feedback/full-page-message";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <FullPageMessage
      title="No se pudo cargar el espacio de trabajo"
      description="Algo falló al preparar el editor. Tu documento no se ha modificado. Vuelve a intentarlo; si el error continúa, recarga la página."
      action={<Button onClick={() => retry()}>Reintentar</Button>}
    />
  );
}
