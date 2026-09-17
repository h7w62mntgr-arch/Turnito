import "dotenv/config";
import { defineConfig } from "prisma/config";

// El CLI (migraciones) usa el session pooler de Supabase (puerto 5432).
// La app en runtime usa DATABASE_URL (pooler, puerto 6543) — ver lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
