"use client";

// Último recurso: se usa solo si falla el layout raíz, así que reemplaza todo el documento.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Algo salió mal</h1>
        <p style={{ color: "#666" }}>No pudimos cargar la página. Probá de nuevo en un momento.</p>
        <button
          onClick={reset}
          style={{
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
        {error.digest && <p style={{ color: "#999", fontSize: "0.75rem" }}>Código: {error.digest}</p>}
      </body>
    </html>
  );
}
