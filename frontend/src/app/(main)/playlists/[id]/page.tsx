'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrackList } from '@/components/user/track/TrackList';
import { EditPlaylistDialog } from '@/components/user/playlist/EditPlaylistDialog';
import { api } from '@/utils/api';
import { Playlist } from '@/types';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { MusicAuthDialog } from '@/components/ui/data-table/data-table-modals';

export default function PlaylistPage() {
  const { id } = useParams();
  const { isAuthenticated, dialogOpen, setDialogOpen, handleProtectedAction } =
    useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Check if this is a special system playlist
  const isVibeRewindPlaylist = playlist?.name === 'Vibe Rewind';
  const isFavoritePlaylist = playlist?.type === 'FAVORITE';
  const isSpecialPlaylist = isVibeRewindPlaylist || isFavoritePlaylist;

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        setLoading(true);

        // Get token if available
        const token = localStorage.getItem('userToken');

        console.log('Fetching playlist with ID:', id);
        const response = await api.playlists.getById(
          id as string,
          token ?? undefined
        );
        console.log('Playlist response:', response);

        if (response.success) {
          setPlaylist(response.data);
        } else {
          setError(response.message || 'Could not load playlist');
        }
      } catch (error: any) {
        console.error('Error fetching playlist:', error);
        setError(error.message || 'Could not load playlist');
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
        const token = localStorage.getItem('userToken');
        if (!token || !playlist) return;

        await api.playlists.removeTrack(id as string, trackId, token);
        setPlaylist({
          ...playlist,
          tracks: playlist.tracks.filter((t) => t.id !== trackId),
          totalTracks: playlist.totalTracks - 1,
        });
      } catch (error) {
        console.error('Error removing track:', error);
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
                <svg
                  className="w-16 h-16"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium text-white/70">
            {playlist.privacy === 'PRIVATE'
              ? 'Private Playlist'
              : 'Public Playlist'}
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
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
                Favorites
              </span>
            )}
            {playlist.isAIGenerated && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                <span>Personalized</span>
              </span>
            )}
          </div>
          {playlist.description && (
            <p className="text-sm text-white/70">{playlist.description}</p>
          )}
          <div className="flex items-center gap-1 text-sm text-white/70">
            <span>{playlist.tracks.length} songs</span>
          </div>
          <div className="mt-4">
            {playlist.canEdit && !playlist.isAIGenerated && (
              <Button
                onClick={() => handleProtectedAction(() => setIsEditOpen(true))}
                disabled={false}
              >
                Edit playlist
              </Button>
            )}
            {isVibeRewindPlaylist && (
              <Button
                onClick={() =>
                  handleProtectedAction(async () => {
                    try {
                      const token = localStorage.getItem('userToken');
                      if (!token) return;

                      await api.playlists.updateVibeRewindPlaylist(token);

                      // Refresh the page to show updated playlist
                      window.location.reload();
                    } catch (error) {
                      console.error('Error updating Vibe Rewind:', error);
                    }
                  })
                }
                variant="outline"
                className="ml-2"
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
          allowRemove={playlist.canEdit && isAuthenticated}
          onRemove={handleRemoveTrack}
          requiresAuth={!isAuthenticated}
        />
      </div>

      <EditPlaylistDialog
        playlist={playlist}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        isSpecialPlaylist={isSpecialPlaylist}
      />

      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
