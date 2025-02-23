"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { CreatePlaylistDialog } from "@/components/playlist/CreatePlaylistDialog";
import { Playlist } from "@/types";
import { api } from "@/utils/api";
import { toast } from "sonner";

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        router.push("/login");
        return;
      }

      const response = await api.playlists.getAll(token);
      console.log("Playlists:", response);
      setPlaylists(response.data || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Không thể tải danh sách playlist");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handlePlaylistClick = (id: string) => {
    router.push(`/playlists/${id}`);
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Playlists của bạn</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Tạo playlist mới
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Bạn chưa có playlist nào. Hãy tạo playlist đầu tiên!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onClick={() => handlePlaylistClick(playlist.id)}
            />
          ))}
        </div>
      )}

      <CreatePlaylistDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchPlaylists}
      />
    </div>
  );
}
