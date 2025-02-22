/*
  Warnings:

  - You are about to drop the column `artistProfileId` on the `track_artist` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[trackId,artistId]` on the table `track_artist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `artistId` to the `track_artist` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "track_artist" DROP CONSTRAINT "track_artist_artistProfileId_fkey";

-- DropIndex
DROP INDEX "track_artist_artistProfileId_idx";

-- DropIndex
DROP INDEX "track_artist_trackId_artistProfileId_key";

-- AlterTable
ALTER TABLE "track_artist" DROP COLUMN "artistProfileId",
ADD COLUMN     "artistId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "track_artist_artistId_idx" ON "track_artist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "track_artist_trackId_artistId_key" ON "track_artist"("trackId", "artistId");

-- AddForeignKey
ALTER TABLE "track_artist" ADD CONSTRAINT "track_artist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
