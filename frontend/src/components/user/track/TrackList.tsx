import { Track } from "@/types";
import { useTrack } from "@/contexts/TrackContext";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";

interface TrackListProps {
  tracks: Track[];
  onRemove?: (trackId: string) => void;
  allowRemove?: boolean;
  showAlbum?: boolean;
  showDateAdded?: boolean;
  requiresAuth?: boolean;
}

export function TrackList({
  tracks,
  onRemove,
  allowRemove = false,
  showAlbum = false,
  showDateAdded = false,
}: TrackListProps) {
  const { playTrack, currentTrack, trackQueue, isPlaying, pauseTrack } =
    useTrack();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      pauseTrack();
    } else {
      trackQueue(tracks);
      playTrack(track);
    }
  };

  // Add log when component renders
  console.log("6. Tracks prop:", JSON.stringify(tracks, null, 2));

  return (
    <>
      <div className="space-y-2">
        {tracks?.map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;

          return (
            <div
              key={track.id}
              className="group grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] items-center gap-4 rounded-md px-4 py-2 text-sm hover:bg-white/10 cursor-pointer relative"
              onClick={() => handlePlay(track)}
            >
              {/* Track number / Play/pause icon */}
              <div className="flex items-center justify-center w-4">
                <span
                  className={`group-hover:hidden ${
                    isCurrentTrack ? "text-[#A57865]" : ""
                  }`}
                >
                  {index + 1}
                </span>
                <button
                  className="hidden group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(track);
                  }}
                >
                  {isCurrentlyPlaying ? (
                    <svg
                      className="w-4 h-4 text-[#A57865]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Track info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className={`font-medium ${
                      isCurrentTrack ? "text-[#A57865]" : ""
                    }`}
                  >
                    {track.title}
                  </span>
                  <span className="text-sm text-white/70">
                    {track.artist?.artistName}
                  </span>
                </div>
              </div>

              {/* Album (if showAlbum=true) */}
              {showAlbum && (
                <div className="text-white/70">{track.album?.title || "-"}</div>
              )}

              {/* Date added (if showDateAdded=true) */}
              {showDateAdded && (
                <div className="text-white/70">
                  {new Date(track.createdAt).toLocaleDateString("vi-VN")}
                </div>
              )}

              {/* Duration and remove button */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-white/70">
                  {Math.floor(track.duration / 60)}:
                  {String(track.duration % 60).padStart(2, "0")}
                </span>

                {allowRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove?.(track.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-white/90 transition-opacity"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
