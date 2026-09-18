import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SignupForm } from "./signup-form";

async function load(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, type: true, phone: true, teamSignupOpen: true },
  });
  return business?.type === "CANCHA" ? business : null;
}

export async function generateMetadata({ params }: PageProps<"/liga/[slug]/anotarse">): Promise<Metadata> {
  const business = await load((await params).slug);
  return {
    title: business ? `Anotá tu cuadro · ${business.name}` : "Anotá tu cuadro — Pinta",
    description: business ? `Sumá tu cuadro a la liga de ${business.name}.` : undefined,
  };
}

export default async function AnotarsePage({ params }: PageProps<"/liga/[slug]/anotarse">) {
  const { slug } = await params;
  const business = await load(slug);
  if (!business) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Anotá tu cuadro</CardTitle>
          <CardDescription>
            {business.teamSignupOpen
              ? `Sumate a la liga de ${business.name}. Tu cuadro aparece al toque en la tabla.`
              : "Las inscripciones están cerradas por ahora."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {business.teamSignupOpen ? (
            <SignupForm slug={slug} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {business.phone
                ? `Si querés jugar, escribile a la cancha al ${business.phone}.`
                : "Si querés jugar, hablá con la cancha."}
            </p>
          )}
          <Link href={`/liga/${slug}`} className="text-center text-sm underline underline-offset-4">
            Volver a la tabla
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
