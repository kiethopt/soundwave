import { Music } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { Playlist } from "@/types";

interface PlaylistCardProps {
  playlist: Playlist;
  onClick: () => void;
}

export function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-card hover:bg-accent rounded-lg p-4 cursor-pointer transition-colors"
    >
      <div className="aspect-square mb-4 rounded-md bg-muted overflow-hidden">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <Music className="w-12 h-12 text-primary/60" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold truncate">{playlist.name}</h3>

        {playlist.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {playlist.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {playlist.privacy === "PRIVATE" ? "Riêng tư" : "Công khai"}
          </span>
          <span>•</span>
          <span>{playlist.totalTracks} bài hát</span>
          {playlist.totalDuration > 0 && (
            <>
              <span>•</span>
              <span>{formatTime(playlist.totalDuration)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
