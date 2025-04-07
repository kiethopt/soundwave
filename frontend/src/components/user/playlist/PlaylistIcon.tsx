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
  const isVibeRewind = name === "Vibe Rewind";
  const isFavorite = type === "FAVORITE";
  const isWelcomeMix = name === "Welcome Mix";
  const isNormalPlaylist =
    type === "NORMAL" && !isAIGenerated && !isVibeRewind && !isWelcomeMix;

  // Chỉ hiển thị hình ảnh bìa cho playlist normal
  const shouldShowCover = isNormalPlaylist && coverUrl;

  // Hiển thị icon thích hợp dựa vào loại playlist
  if (shouldShowCover) {
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

  // Nếu không hiển thị hình ảnh bìa, hiển thị icon phù hợp với loại playlist
  if (isFavorite) {
    return (
      <Music
        className={`text-primary ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (isVibeRewind) {
    return (
      <Music
        className={`text-emerald-500 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

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

  // Default icon cho các playlist khác
  return <Music className={className} style={{ width: size, height: size }} />;
}
