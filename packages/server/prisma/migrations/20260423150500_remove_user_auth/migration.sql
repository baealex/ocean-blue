-- Remove multi-user auth tables and make tunnel tokens instance-owned.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_TunnelToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxTunnels" INTEGER NOT NULL DEFAULT 10,
    "currentTunnels" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO "new_TunnelToken" (
    "id",
    "token",
    "name",
    "maxTunnels",
    "currentTunnels",
    "createdAt",
    "lastUsed",
    "isActive"
)
SELECT
    "id",
    "token",
    "name",
    "maxTunnels",
    "currentTunnels",
    "createdAt",
    "lastUsed",
    "isActive"
FROM "TunnelToken";

DROP TABLE "TunnelToken";
ALTER TABLE "new_TunnelToken" RENAME TO "TunnelToken";
CREATE UNIQUE INDEX "TunnelToken_token_key" ON "TunnelToken"("token");

DROP TABLE IF EXISTS "Profile";
DROP TABLE IF EXISTS "User";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
