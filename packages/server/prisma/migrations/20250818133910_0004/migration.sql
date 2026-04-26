/*
  Warnings:

  - You are about to drop the column `htmlContent` on the `HtmlPage` table. All the data in the column will be lost.
  - Added the required column `content` to the `HtmlPage` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HtmlPage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'html',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HtmlPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HtmlPage" ("createdAt", "id", "title", "updatedAt", "url", "userId", "content") SELECT "createdAt", "id", "title", "updatedAt", "url", "userId", "htmlContent" FROM "HtmlPage";
DROP TABLE "HtmlPage";
ALTER TABLE "new_HtmlPage" RENAME TO "HtmlPage";
CREATE UNIQUE INDEX "HtmlPage_url_key" ON "HtmlPage"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
