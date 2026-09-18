import { headers } from "next/headers";

// URL absoluta del sitio, para QR y links que se comparten fuera de la app.
// Se arma con el host del pedido: anda igual en localhost, en Vercel y con dominio propio.
export async function publicUrl(path: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
