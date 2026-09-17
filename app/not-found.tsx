import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="max-w-sm text-muted-foreground">
        Puede que el link esté mal escrito o que el negocio ya no esté disponible.
      </p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Ir al inicio
      </Link>
    </main>
  );
}
