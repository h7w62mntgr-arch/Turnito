@AGENTS.md
@docs/SPEC.md

# Pinta

Nombre del producto: **Pinta** ("¿pinta fulbito el martes?" / "buena pinta"). Dominio objetivo `pinta.uy`.

# Convenciones del repo

- Stack: Next.js (App Router) + TypeScript + Prisma + Supabase (Postgres + Auth) + Tailwind + shadcn/ui, deploy en Vercel.
- Todo dato de negocio se scopea por `businessId`. Nunca consultar sin filtrar por negocio.
- Fechas: guardar en UTC, calcular slots en `America/Montevideo`.
- Doble-booking: se impide en la base (exclusion constraint sobre `Booking`), no solo en el front.
- Trabajar en slices verticales chicos, una branch por feature.
