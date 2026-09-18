CREATE UNIQUE INDEX "Collection_id_ownerId_key" ON "Collection"("id", "ownerId");
CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "ownerId" TEXT NOT NULL,
  "collectionId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Bookmark_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Bookmark_collectionId_ownerId_fkey" FOREIGN KEY ("collectionId", "ownerId") REFERENCES "Collection"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Bookmark_ownerId_createdAt_id_idx" ON "Bookmark"("ownerId", "createdAt", "id");
CREATE INDEX "Bookmark_ownerId_collectionId_createdAt_id_idx" ON "Bookmark"("ownerId", "collectionId", "createdAt", "id");
