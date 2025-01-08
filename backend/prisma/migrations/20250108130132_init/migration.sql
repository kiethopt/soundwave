-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ARTIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "AlbumType" AS ENUM ('ALBUM', 'EP', 'SINGLE');

-- CreateEnum
CREATE TYPE "HistoryType" AS ENUM ('SEARCH', 'PLAY');

-- CreateEnum
CREATE TYPE "PlaylistPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PlaylistType" AS ENUM ('FAVORITE', 'NORMAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_TRACK', 'NEW_ALBUM', 'EVENT', 'FOLLOW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bio" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationRequestedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "monthlyListeners" INTEGER NOT NULL DEFAULT 0,
    "discordMessageId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_profiles" (
    "id" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "bio" TEXT,
    "socialMediaLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "artist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_genre" (
    "id" TEXT NOT NULL,
    "artistProfileId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "trackCount" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "type" "AlbumType" NOT NULL DEFAULT 'ALBUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "discordMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "trackNumber" INTEGER,
    "coverUrl" TEXT,
    "audioUrl" TEXT NOT NULL,
    "audioMessageId" TEXT,
    "discordMessageId" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "histories" (
    "id" TEXT NOT NULL,
    "type" "HistoryType" NOT NULL,
    "query" TEXT,
    "duration" INTEGER,
    "completed" BOOLEAN,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trackId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "privacy" "PlaylistPrivacy" NOT NULL DEFAULT 'PRIVATE',
    "type" "PlaylistType" NOT NULL DEFAULT 'NORMAL',
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "totalTracks" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follow_artist" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follow_artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_genre" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_artist" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_track" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackOrder" INTEGER NOT NULL,

    CONSTRAINT "playlist_track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_like_track" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_like_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_discordMessageId_key" ON "users"("discordMessageId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_verifiedAt_idx" ON "users"("verifiedAt");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_username_key" ON "users"("email", "username");

-- CreateIndex
CREATE UNIQUE INDEX "artist_profiles_artistName_key" ON "artist_profiles"("artistName");

-- CreateIndex
CREATE UNIQUE INDEX "artist_profiles_userId_key" ON "artist_profiles"("userId");

-- CreateIndex
CREATE INDEX "artist_profiles_artistName_idx" ON "artist_profiles"("artistName");

-- CreateIndex
CREATE UNIQUE INDEX "artist_genre_artistProfileId_genreId_key" ON "artist_genre"("artistProfileId", "genreId");

-- CreateIndex
CREATE UNIQUE INDEX "albums_discordMessageId_key" ON "albums"("discordMessageId");

-- CreateIndex
CREATE INDEX "albums_title_idx" ON "albums"("title");

-- CreateIndex
CREATE INDEX "albums_artistId_idx" ON "albums"("artistId");

-- CreateIndex
CREATE INDEX "albums_releaseDate_idx" ON "albums"("releaseDate");

-- CreateIndex
CREATE INDEX "albums_isActive_idx" ON "albums"("isActive");

-- CreateIndex
CREATE INDEX "albums_createdAt_idx" ON "albums"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "albums_title_artistId_key" ON "albums"("title", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_audioMessageId_key" ON "tracks"("audioMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_discordMessageId_key" ON "tracks"("discordMessageId");

-- CreateIndex
CREATE INDEX "tracks_title_idx" ON "tracks"("title");

-- CreateIndex
CREATE INDEX "tracks_artistId_idx" ON "tracks"("artistId");

-- CreateIndex
CREATE INDEX "tracks_albumId_idx" ON "tracks"("albumId");

-- CreateIndex
CREATE INDEX "tracks_playCount_idx" ON "tracks"("playCount");

-- CreateIndex
CREATE INDEX "tracks_releaseDate_idx" ON "tracks"("releaseDate");

-- CreateIndex
CREATE INDEX "tracks_isActive_idx" ON "tracks"("isActive");

-- CreateIndex
CREATE INDEX "tracks_createdAt_idx" ON "tracks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_title_artistId_key" ON "tracks"("title", "artistId");

-- CreateIndex
CREATE INDEX "histories_userId_idx" ON "histories"("userId");

-- CreateIndex
CREATE INDEX "histories_type_idx" ON "histories"("type");

-- CreateIndex
CREATE INDEX "histories_trackId_idx" ON "histories"("trackId");

-- CreateIndex
CREATE INDEX "histories_createdAt_idx" ON "histories"("createdAt");

-- CreateIndex
CREATE INDEX "histories_playCount_idx" ON "histories"("playCount");

-- CreateIndex
CREATE UNIQUE INDEX "histories_userId_trackId_type_key" ON "histories"("userId", "trackId", "type");

-- CreateIndex
CREATE INDEX "playlists_userId_idx" ON "playlists"("userId");

-- CreateIndex
CREATE INDEX "playlists_privacy_idx" ON "playlists"("privacy");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_userId_type_key" ON "playlists"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_name_userId_key" ON "playlists"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE INDEX "genres_name_idx" ON "genres"("name");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "events_artistId_idx" ON "events"("artistId");

-- CreateIndex
CREATE INDEX "events_startDate_idx" ON "events"("startDate");

-- CreateIndex
CREATE INDEX "events_endDate_idx" ON "events"("endDate");

-- CreateIndex
CREATE INDEX "events_isActive_idx" ON "events"("isActive");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "events_title_artistId_key" ON "events"("title", "artistId");

-- CreateIndex
CREATE INDEX "user_follow_artist_followerId_idx" ON "user_follow_artist"("followerId");

-- CreateIndex
CREATE INDEX "user_follow_artist_followingId_idx" ON "user_follow_artist"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follow_artist_followerId_followingId_key" ON "user_follow_artist"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "album_genre_albumId_idx" ON "album_genre"("albumId");

-- CreateIndex
CREATE INDEX "album_genre_genreId_idx" ON "album_genre"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "album_genre_albumId_genreId_key" ON "album_genre"("albumId", "genreId");

-- CreateIndex
CREATE INDEX "track_artist_trackId_idx" ON "track_artist"("trackId");

-- CreateIndex
CREATE INDEX "track_artist_artistId_idx" ON "track_artist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "track_artist_trackId_artistId_key" ON "track_artist"("trackId", "artistId");

-- CreateIndex
CREATE INDEX "playlist_track_playlistId_idx" ON "playlist_track"("playlistId");

-- CreateIndex
CREATE INDEX "playlist_track_trackId_idx" ON "playlist_track"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_track_playlistId_trackId_key" ON "playlist_track"("playlistId", "trackId");

-- CreateIndex
CREATE INDEX "user_like_track_userId_idx" ON "user_like_track"("userId");

-- CreateIndex
CREATE INDEX "user_like_track_trackId_idx" ON "user_like_track"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "user_like_track_userId_trackId_key" ON "user_like_track"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genre" ADD CONSTRAINT "artist_genre_artistProfileId_fkey" FOREIGN KEY ("artistProfileId") REFERENCES "artist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genre" ADD CONSTRAINT "artist_genre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "histories" ADD CONSTRAINT "histories_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "histories" ADD CONSTRAINT "histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follow_artist" ADD CONSTRAINT "user_follow_artist_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follow_artist" ADD CONSTRAINT "user_follow_artist_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_genre" ADD CONSTRAINT "album_genre_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_genre" ADD CONSTRAINT "album_genre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artist" ADD CONSTRAINT "track_artist_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artist" ADD CONSTRAINT "track_artist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_track" ADD CONSTRAINT "playlist_track_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_track" ADD CONSTRAINT "playlist_track_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_like_track" ADD CONSTRAINT "user_like_track_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_like_track" ADD CONSTRAINT "user_like_track_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
