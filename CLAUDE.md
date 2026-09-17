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
- Auth: toda página y Server Action del dashboard empieza con `requireOwner()` (lib/auth.ts) y usa `owner.businessId`. Nunca confiar en un businessId que venga del formulario.
- Las operaciones de datos viven en `lib/` y reciben `businessId`; las escrituras por id usan `updateMany`/`deleteMany` con `{ id, businessId }`.
- Errores para mostrarle al dueño: `SetupError` (lib/setup.ts). El resto se loguea y se muestra un mensaje genérico.
- Scripts sueltos con tsx no leen `.env` solos: `npx tsx --env-file=.env script.ts`.
