-- La tabla interna de Prisma tambien vive en el schema public, que Supabase expone
-- por su API REST. Sin politicas, RLS la deja invisible para la anon key.
-- Prisma se conecta con un rol que ignora RLS, asi que sus migraciones siguen funcionando.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
