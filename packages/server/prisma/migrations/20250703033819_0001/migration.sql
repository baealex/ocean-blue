-- CreateTable
CREATE TABLE "TunnelToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "maxTunnels" INTEGER NOT NULL DEFAULT 10,
    "currentTunnels" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TunnelToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TunnelSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subdomain" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clientVersion" TEXT,
    "clientIp" TEXT,
    CONSTRAINT "TunnelSession_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "TunnelToken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TunnelToken_token_key" ON "TunnelToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TunnelSession_subdomain_key" ON "TunnelSession"("subdomain");
