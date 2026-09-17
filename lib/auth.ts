import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string };

// getClaims valida el JWT; no usar getSession en el servidor.
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getOwner = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  return prisma.owner.findUnique({
    where: { authUserId: user.id },
    include: { business: true },
  });
});

// Punto de entrada de toda página o acción del dashboard.
// Devuelve el dueño con su negocio; todo lo que se lea o escriba se filtra por owner.businessId.
export async function requireOwner() {
  await requireUser();
  const owner = await getOwner();
  if (!owner) redirect("/onboarding");
  return owner;
}
