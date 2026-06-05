ALTER TABLE "User" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'credentials';
ALTER TABLE "User" ADD COLUMN "authProviderAccountHash" TEXT;

CREATE UNIQUE INDEX "User_authProvider_authProviderAccountHash_key" ON "User"("authProvider", "authProviderAccountHash");
