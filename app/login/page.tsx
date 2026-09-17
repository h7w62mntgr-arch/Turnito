import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Ingresar — Pinta" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const mode = params.modo === "registro" ? "signup" : "login";
  const next = typeof params.next === "string" ? params.next : undefined;
  const linkError = params.error === "link";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {mode === "login" ? "Ingresá a Pinta" : "Registrá tu negocio"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Administrá tus reservas, horarios y servicios."
              : "Creá tu cuenta y en unos minutos tenés tu página de reservas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {linkError && (
            <p role="alert" className="text-sm text-destructive">
              El link expiró o ya se usó. Ingresá con tu email y contraseña.
            </p>
          )}
          <AuthForm key={mode} mode={mode} next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
