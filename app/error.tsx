"use client";

import { Button } from "@/components/ui/button";

// Pantalla que se muestra si algo falla en el servidor.
// En producción Next oculta el detalle del error; el digest permite ubicarlo en los logs.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="max-w-sm text-muted-foreground">
        No pudimos cargar esta página. Probá de nuevo en un momento.
      </p>
      <Button onClick={reset} size="lg">
        Reintentar
      </Button>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Si le pasás este código a quien te instaló Pinta, lo puede rastrear: {error.digest}
        </p>
      )}
    </main>
  );
}
