/*
  Warnings:

  - You are about to drop the column `followingId` on the `user_follow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[followerId,followingUserId,followingType]` on the table `user_follow` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[followerId,followingArtistId,followingType]` on the table `user_follow` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "user_follow" DROP CONSTRAINT "user_follow_following_artist_fkey";

-- DropForeignKey
ALTER TABLE "user_follow" DROP CONSTRAINT "user_follow_following_user_fkey";

-- DropIndex
DROP INDEX "user_follow_followerId_followingId_followingType_key";

-- DropIndex
DROP INDEX "user_follow_followingId_idx";

-- AlterTable
ALTER TABLE "user_follow" DROP COLUMN "followingId",
ADD COLUMN     "followingArtistId" TEXT,
ADD COLUMN     "followingUserId" TEXT;

-- CreateIndex
CREATE INDEX "user_follow_followingUserId_idx" ON "user_follow"("followingUserId");

-- CreateIndex
CREATE INDEX "user_follow_followingArtistId_idx" ON "user_follow"("followingArtistId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follow_followerId_followingUserId_followingType_key" ON "user_follow"("followerId", "followingUserId", "followingType");

-- CreateIndex
CREATE UNIQUE INDEX "user_follow_followerId_followingArtistId_followingType_key" ON "user_follow"("followerId", "followingArtistId", "followingType");

-- AddForeignKey
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_followingUserId_fkey" FOREIGN KEY ("followingUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_followingArtistId_fkey" FOREIGN KEY ("followingArtistId") REFERENCES "artist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
