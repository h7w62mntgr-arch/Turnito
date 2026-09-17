import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Pinta</h1>
      <p className="max-w-md text-balance text-muted-foreground">
        Reservas online para barberías y canchas. Tus clientes reservan desde el celular, vos te
        olvidás del ida y vuelta por WhatsApp.
      </p>
      <div className="flex gap-3">
        <Link href="/login?modo=registro" className={buttonVariants({ size: "lg" })}>
          Registrá tu negocio
        </Link>
        <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Ingresar
        </Link>
      </div>
    </main>
  );
}
