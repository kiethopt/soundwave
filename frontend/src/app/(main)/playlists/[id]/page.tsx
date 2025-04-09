"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TrackList } from "@/components/user/track/TrackList";
import { EditPlaylistDialog } from "@/components/user/playlist/EditPlaylistDialog";
import { DeletePlaylistDialog } from "@/components/user/playlist/DeletePlaylistDialog";
import { api } from "@/utils/api";
import { Playlist } from "@/types";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { PlaylistIcon } from "@/components/user/playlist/PlaylistIcon";

// Khai báo event bus đơn giản để gọi fetchPlaylists từ sidebar
const playlistUpdateEvent = new CustomEvent("playlist-updated");

export default function PlaylistPage() {
  const params = useParams();
  const id = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;
  const { isAuthenticated, dialogOpen, setDialogOpen, handleProtectedAction } =
    useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const router = useRouter();

  // Check if this is a special system playlist
  const isVibeRewindPlaylist = playlist?.name === "Vibe Rewind";
  const isFavoritePlaylist = playlist?.type === "FAVORITE";
  const isWelcomeMixPlaylist = playlist?.name === "Welcome Mix";
  const isSpecialPlaylist =
    isFavoritePlaylist || isVibeRewindPlaylist || isWelcomeMixPlaylist;

  // Check if this is a normal playlist (not special playlists or AI generated)
  const isNormalPlaylist =
    !playlist?.isAIGenerated &&
    playlist?.type !== "FAVORITE" &&
    playlist?.name !== "Vibe Rewind" &&
    playlist?.name !== "Welcome Mix";

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        setLoading(true);

        // Get token if available
        const token = localStorage.getItem("userToken");

        console.log("Fetching playlist with ID:", id);
        const response = await api.playlists.getById(
          id as string,
          token ?? undefined
        );
        console.log("Playlist response:", response);

        if (response.success) {
          setPlaylist(response.data);
        } else {
          setError(response.message || "Could not load playlist");
        }
      } catch (error: any) {
        console.error("Error fetching playlist:", error);
        setError(error.message || "Could not load playlist");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlaylist();
    }
  }, [id]);

  const handleRemoveTrack = async (trackId: string) => {
    handleProtectedAction(async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token || !playlist) return;

        await api.playlists.removeTrack(id as string, trackId, token);
        setPlaylist({
          ...playlist,
          tracks: playlist.tracks.filter((t) => t.id !== trackId),
          totalTracks: playlist.totalTracks - 1,
        });
      } catch (error) {
        console.error("Error removing track:", error);
      }
    });
  };

  const handleDeletePlaylist = async () => {
    handleProtectedAction(async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token || !playlist) {
          toast.error("Please log in to delete this playlist");
          return;
        }

        setIsDeleteOpen(false); // Close the dialog first

        // Delete the playlist
        await api.playlists.delete(id as string, token);

        // Show success message
        toast.success("Playlist deleted successfully");

        // Wait a bit for the delete operation to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Navigate to home page
        window.location.href = "/";
      } catch (error: any) {
        console.error("Error deleting playlist:", error);
        const errorMessage =
          error.message || "Could not delete playlist. Please try again.";
        toast.error(errorMessage);
        setIsDeleteOpen(false);
      }
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!playlist) return <div>Playlist not found</div>;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-end gap-6 p-6 bg-gradient-to-b from-[#A57865]/30">
        <div className="w-[232px] h-[232px] flex-shrink-0 relative">
          {playlist.coverUrl ? (
            <>
              <Image
                src={playlist.coverUrl}
                alt={playlist.name}
                width={232}
                height={232}
                className="w-full h-full object-cover shadow-lg rounded-md"
              />
              {playlist.isAIGenerated && (
                <div className="absolute top-3 right-3 bg-black/40 rounded-full p-1">
                  <Image
                    src="/images/googleGemini_icon.png"
                    width={36}
                    height={36}
                    alt="AI Generated"
                    className="rounded-full"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center rounded-md">
              <div className="text-white/70">
                <PlaylistIcon
                  name={playlist.name}
                  type={playlist.type}
                  isAIGenerated={playlist.isAIGenerated}
                  size={64}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-white/70">
            {playlist.privacy === "PRIVATE"
              ? "Private Playlist"
              : "Public Playlist"}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-[2rem] font-bold leading-tight">
              {playlist.name}
            </h1>
            {isVibeRewindPlaylist && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400">
                Auto-Updated
              </span>
            )}
            {isFavoritePlaylist && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
                Favorites
              </span>
            )}
            {playlist.isAIGenerated && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                <span>Personalized</span>
              </span>
            )}
            {!isFavoritePlaylist && playlist.privacy === "PRIVATE" && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-300">
                Private
              </span>
            )}
            {playlist.privacy === "PUBLIC" && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                Public
              </span>
            )}
          </div>
          {playlist.description && (
            <p className="text-sm text-white/70">{playlist.description}</p>
          )}
          <div className="flex items-center gap-1 text-sm text-white/70">
            <span>{playlist.tracks.length} songs</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {playlist.canEdit && (
              <>
                {playlist.type === "NORMAL" && (
                  <Button
                    onClick={() =>
                      handleProtectedAction(() => setIsEditOpen(true))
                    }
                  >
                    Edit playlist
                  </Button>
                )}
                {playlist.type === "NORMAL" && (
                  <Button
                    onClick={() => setIsDeleteOpen(true)}
                    variant="destructive"
                    className="ml-2"
                  >
                    Delete playlist
                  </Button>
                )}
              </>
            )}
            {isVibeRewindPlaylist && (
              <Button
                onClick={() =>
                  handleProtectedAction(async () => {
                    try {
                      const token = localStorage.getItem("userToken");
                      if (!token) return;

                      await api.playlists.updateVibeRewindPlaylist(token);

                      // Refresh the page to show updated playlist
                      window.location.reload();
                    } catch (error) {
                      console.error("Error updating Vibe Rewind:", error);
                    }
                  })
                }
                variant="outline"
              >
                Update Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="p-6">
        <div className="mb-4 border-b border-white/10">
          <div className="grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-4 px-4 py-2 text-sm text-white/70">
            <div className="text-center">#</div>
            <div>Title</div>
            <div>Album</div>
            <div>Date added</div>
            <div className="text-right">Duration</div>
          </div>
        </div>

        <TrackList
          tracks={playlist.tracks}
          showAlbum
          showDateAdded
          allowRemove={playlist.canEdit && playlist.type === "NORMAL"}
          onRemove={handleRemoveTrack}
          requiresAuth={!isAuthenticated}
        />
      </div>

      <EditPlaylistDialog
        playlist={playlist}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        isSpecialPlaylist={isSpecialPlaylist}
        onPlaylistUpdated={(updatedPlaylist) => {
          // Cập nhật state playlist với dữ liệu mới
          // Đảm bảo giữ lại thuộc tính canEdit nếu không có trong dữ liệu mới
          const updatedTracks = updatedPlaylist.tracks || [];

          // Format tracks đúng nếu cần thiết
          let formattedTracks = updatedTracks;

          // Kiểm tra nếu tracks được trả về dưới dạng PlaylistTrack thay vì Track
          if (updatedTracks.length > 0 && "track" in updatedTracks[0]) {
            // Giữ lại tracks hiện tại thay vì cố gắng chuyển đổi dữ liệu không đầy đủ
            formattedTracks = playlist.tracks;
          }

          setPlaylist({
            ...updatedPlaylist,
            canEdit:
              updatedPlaylist.canEdit !== undefined
                ? updatedPlaylist.canEdit
                : playlist.canEdit,
            tracks: formattedTracks,
          });

          // Phát sự kiện để sidebar biết cần cập nhật playlists
          window.dispatchEvent(playlistUpdateEvent);
        }}
      />

      <DeletePlaylistDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeletePlaylist}
        playlistName={playlist.name}
      />

      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
