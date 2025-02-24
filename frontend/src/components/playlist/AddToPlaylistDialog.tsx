import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { toast } from "sonner";
import { Playlist } from "@/types";
import Image from "next/image";

interface AddToPlaylistDialogProps {
  trackId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToPlaylistDialog({
  trackId,
  open,
  onOpenChange,
}: AddToPlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPlaylists();
    }
  }, [open]);

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      const response = await api.playlists.getAll(token);
      setPlaylists(response.data);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Không thể tải danh sách playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      await api.playlists.addTrack(playlistId, trackId, token);
      toast.success("Đã thêm bài hát vào playlist");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding track to playlist:", error);
      toast.error(error.message || "Không thể thêm bài hát vào playlist");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm vào playlist</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Đang tải...
          </div>
        ) : playlists.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Bạn chưa có playlist nào
          </div>
        ) : (
          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-12 h-12 relative">
                  {playlist.coverUrl ? (
                    <Image
                      src={playlist.coverUrl}
                      alt={playlist.name}
                      fill
                      className="object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 rounded flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white/70"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium">{playlist.name}</div>
                  <div className="text-sm text-white/60">
                    {playlist.totalTracks} bài hát
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
