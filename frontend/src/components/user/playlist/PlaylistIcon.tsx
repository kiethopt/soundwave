"use client";

import Image from "next/image";
import { Music } from "@/components/ui/Icons";

interface PlaylistIconProps {
  coverUrl?: string | null;
  name: string;
  type: string;
  isAIGenerated?: boolean;
  className?: string;
  size?: number;
}

export function PlaylistIcon({
  coverUrl,
  name,
  type,
  isAIGenerated = false,
  className = "",
  size = 20,
}: PlaylistIconProps) {
  // Xác định nếu đây là playlist bình thường hay đặc biệt
  const isFavorite = type === "FAVORITE";
  const isWelcomeMix = name === "Welcome Mix";
  const isSystemPlaylist = type === "SYSTEM";
  const isNormalPlaylist =
    type === "NORMAL" &&
    !isAIGenerated &&
    !isWelcomeMix &&
    !isSystemPlaylist;

  // Check if there's a valid cover image URL
  const hasValidCoverUrl = coverUrl && coverUrl.trim().length > 0;

  // If cover URL exists, display it regardless of playlist type
  if (hasValidCoverUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={coverUrl}
          alt={name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  // Favorite playlist without cover
  if (isFavorite) {
    return (
      <div
        className={`relative ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full"
            style={{ width: size, height: size }}
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="#A57865"
            />
          </svg>
        </div>
      </div>
    );
  }

  // AI-generated playlist without cover
  if (isAIGenerated) {
    return (
      <div
        className={`relative ${className}`}
        style={{ width: size, height: size }}
      >
        <Music className="w-full h-full text-purple-400" />
      </div>
    );
  }

  // Default icon for other playlists without covers
  return <Music className={className} style={{ width: size, height: size }} />;
}
