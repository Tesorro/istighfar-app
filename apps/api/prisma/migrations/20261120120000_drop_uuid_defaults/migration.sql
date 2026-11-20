-- Prisma Client generates UUIDs. Database defaults are not part of the schema.
ALTER TABLE "daily_progress" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "families" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "invitations" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
