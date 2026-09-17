# Pinta

Reservas online para negocios de Uruguay: barberías (turnos) y canchas de fútbol (reservas + liga con ranking).

La especificación completa está en [docs/SPEC.md](docs/SPEC.md).

## Desarrollo

1. Copiá `.env.example` a `.env` y completá las cadenas de conexión de Supabase.
2. Instalá dependencias y aplicá migraciones:

```bash
npm install
npm run db:deploy
npm run dev
```

## Stack

Next.js (App Router) + TypeScript · Prisma + Supabase (Postgres) · Tailwind CSS · Vercel
