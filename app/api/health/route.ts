import { prisma } from "@/lib/prisma";

// Diagnóstico de despliegue: dice si las variables de entorno llegaron bien
// y si se puede hablar con la base. Nunca devuelve valores secretos.
// Es temporal: borrar cuando el deploy esté andando.

export const dynamic = "force-dynamic";

function describe(value: string | undefined) {
  if (value === undefined) return { presente: false };
  return {
    presente: true,
    largo: value.length,
    // Errores típicos al pegar en un panel web:
    tieneComillas: /^["']|["']$/.test(value),
    tieneEspaciosAlBorde: value !== value.trim(),
    tieneSaltoDeLinea: /[\r\n]/.test(value),
  };
}

// Las cadenas de conexión llevan la contraseña: se tapa antes de mostrar nada.
function redact(text: string) {
  return text.replace(/\/\/([^:/@\s]+):([^@\s]+)@/g, "//$1:***@");
}

export async function GET() {
  const env = {
    DATABASE_URL: describe(process.env.DATABASE_URL),
    DIRECT_URL: describe(process.env.DIRECT_URL),
    NEXT_PUBLIC_SUPABASE_URL: describe(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: describe(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  };

  const host = process.env.DATABASE_URL?.match(/@([^/]+)\//)?.[1] ?? null;

  let base: { ok: boolean; error?: string; negocios?: number };
  try {
    base = { ok: true, negocios: await prisma.business.count() };
  } catch (e) {
    base = { ok: false, error: redact(e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 800) };
  }

  return Response.json(
    { env, base, hostDeLaBase: host, region: process.env.VERCEL_REGION ?? null },
    { status: base.ok ? 200 : 500 },
  );
}
