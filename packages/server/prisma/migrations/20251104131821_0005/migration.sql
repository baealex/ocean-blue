/*
  Warnings:

  - You are about to drop the `HtmlPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PageView` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HtmlPage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PageView";
PRAGMA foreign_keys=on;
