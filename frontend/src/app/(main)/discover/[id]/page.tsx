'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { ArtistProfile, Track, Playlist, Album } from '@/types';
import toast from 'react-hot-toast';
import { Play, Pause, AddSimple, Right } from '@/components/ui/Icons';
import { ArrowLeft, Heart, ListMusic, MoreHorizontal, Share2 } from 'lucide-react';
import { useTrack } from '@/contexts/TrackContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

export default function DiscoveryGenrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const genreData = JSON.parse(localStorage.getItem('genreData') || '{}')
  const dominantColor = genreData.color || null;
  const genreName = genreData.name || '';
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [topAlbums, setTopAlbums] = useState<Album[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistProfile[]>([]);
  const [newestTracks, setNewestTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [section, setSection] = useState<string | null>(null);
  const [genreSystemPlaylists, setGenreSystemPlaylists] = useState<Playlist[]>([]);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(
    new Set()
  );
  const { handleProtectedAction } = useAuth();

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
    addToQueue
  } = useTrack();

  useEffect(() => {
    const storedToken = localStorage.getItem('userToken');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);

    // Fetch genre top albums, tracks, and artists, and newest tracks
    const fetchGenreData = async () => {
      try {
        const [albums, tracks, artists, newest, systemPlaylists] = await Promise.all([
          api.user.getGenreTopAlbums(id, storedToken),
          api.user.getGenreTopTracks(id, storedToken),
          api.user.getGenreTopArtists(id, storedToken),
          api.user.getGenreNewestTracks(id, storedToken),
          api.playlists.getUserSystemPlaylist(),
        ]);

        const newestTrack = newest.filter((track: { type: string; }) => track.type === "SINGLE");
        setTopAlbums(albums);
        setTopTracks(tracks);
        setTopArtists(artists);
        setNewestTracks(newestTrack);

        const sortedGenreSystemPlaylists = sortSystemPlaylists(systemPlaylists, id);
        console.log('Sorted Genre System Playlists:', sortedGenreSystemPlaylists);
        setGenreSystemPlaylists(sortedGenreSystemPlaylists);
      } catch (error) {
        console.error('Error fetching genre data:', error);
        toast.error('Failed to load genre data');
      }
    }

    const fetchPlaylists = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.playlists.getAll(token);
        setPlaylists(response.data.filter((p: Playlist) => p.type === 'NORMAL'));
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };

    fetchPlaylists();
    fetchGenreData();
  }, [id, router]);

  useEffect(() => {
    const fetchFavoriteIds = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      try {
        const playlistsResponse = await api.playlists.getUserPlaylists(token);
        if (
          playlistsResponse.success &&
          Array.isArray(playlistsResponse.data)
        ) {
          const favoritePlaylistInfo = playlistsResponse.data.find(
            (p: Playlist) => p.type === "FAVORITE"
          );
          if (favoritePlaylistInfo && favoritePlaylistInfo.id) {
            const favoriteDetailsResponse = await api.playlists.getById(
              favoritePlaylistInfo.id,
              token
            );
            if (
             favoriteDetailsResponse.success &&
              favoriteDetailsResponse.data?.tracks
            ) {
              const trackIds = favoriteDetailsResponse.data.tracks.map(
                (t: Track) => t.id
              );
              setFavoriteTrackIds(new Set(trackIds));
            } else {
              setFavoriteTrackIds(new Set());
            }
          } else {
            setFavoriteTrackIds(new Set());
          }
        } else {
          setFavoriteTrackIds(new Set());
        }
      } catch (error) {
        console.error("Error fetching favorite track IDs:", error);
        setFavoriteTrackIds(new Set());
      }
    };
    fetchFavoriteIds();

    // Listener for favorite changes
    const handleFavoritesChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        action: "add" | "remove";
        trackId: string;
      }>;
      if (!customEvent.detail) return;
      const { action, trackId } = customEvent.detail;
      setFavoriteTrackIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (action === "add") {
          newIds.add(trackId);
        } else {
          newIds.delete(trackId);
        }
        return newIds;
      });
    };

    window.addEventListener("favorites-changed", handleFavoritesChanged);

    return () => {
      window.removeEventListener("favorites-changed", handleFavoritesChanged);
    };
  }, []);

  const handleToggleFavorite = async (
    trackId: string,
    isCurrentlyFavorite: boolean
  ) => {
    handleProtectedAction(async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      // Optimistic UI update
      setFavoriteTrackIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (isCurrentlyFavorite) {
          newIds.delete(trackId);
        } else {
          newIds.add(trackId);
        }
        return newIds;
      });

      try {
        if (isCurrentlyFavorite) {
          await api.tracks.unlike(trackId, token);
          toast.success("Removed from Favorites");
          window.dispatchEvent(
            new CustomEvent("favorites-changed", {
              detail: { action: "remove", trackId },
            })
          );
        } else {
          await api.tracks.like(trackId, token);
          toast.success("Added to Favorites");
          window.dispatchEvent(
            new CustomEvent("favorites-changed", {
              detail: { action: "add", trackId },
            })
          );
        }
      } catch (error: any) {
        console.error("Error toggling favorite status:", error);
        toast.error(error.message || "Failed to update favorites");
        // Revert optimistic UI on error
        setFavoriteTrackIds((prevIds) => {
          const newIds = new Set(prevIds);
          if (isCurrentlyFavorite) {
            newIds.add(trackId);
          } else {
            newIds.delete(trackId);
          }
          return newIds;
        });
      }
    });
  };


  const sortSystemPlaylists = (playlists: Playlist[], genreId: string) => {
    const genreSystemPlaylists = playlists.filter((playlist) => {
      if (!playlist.tracks || playlist.tracks.length === 0) {
        return false; // Bỏ qua playlist không có bài hát nào
      }
      const genreTrackCount = playlist.tracks.filter((track) =>
        track.genres.some((genre) => genre.genre.id === genreId)
      ).length;
      const genrePercentage = genreTrackCount / playlist.tracks.length;
      return genrePercentage >= 0.7; // Chỉ giữ lại playlist có ít nhất 70% bài hát thuộc thể loại
    });
    return genreSystemPlaylists;
  };

  const handleAddToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      console.log('Adding track to playlist:', { playlistId, trackId });
      const token = localStorage.getItem('userToken');

      await api.playlists.addTrack(playlistId, trackId, token || '');
      toast.success('Track added to playlist');
    } catch (error: any) {
      console.error('Error adding track:', error);
      toast.error(error.message || 'Cannot add track to playlist');
    }
  };

  const getArtistTracks = async (artistId: string) => {
    try {
      if (!token) {
        throw new Error('Token is null');
      }
      const data = await api.artists.getTrackByArtistId(artistId, token);
      return data.tracks.sort((a: any, b: any) => b.playCount - a.playCount);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const handleArtistPlay = async (
    artist: ArtistProfile,
    type: 'topArtist',
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setQueueType(type);
    const tracks = await getArtistTracks(artist.id);
    if (tracks.length === 0) {
      toast.error('No tracks found for this artist');
      return;
    }
    if (isPlaying && currentTrack?.id === tracks[0].id) {
      pauseTrack();
    } else {
      setQueueType('topArtist');
      trackQueue(tracks);
      playTrack(tracks[0]);
    }
  };

  const handleTrackPlay = (track: Track, section: string, tracks: Track[]) => {
    if (isPlaying && currentTrack?.id === track.id) {
      pauseTrack();
    } else {
      setQueueType('track');
      trackQueue(tracks);
      setSection(section);
      playTrack(track);
    }
  };

  const handleAlbumPlay = (album: Album) => {
    if (isPlaying && currentTrack?.id === album.id) {
      pauseTrack();
    } else {
      setQueueType('album');
      trackQueue(album.tracks);
      playTrack(album.tracks[0]);
    }
  }

  const isArtistPlaying = (artistId: string, type: 'topArtist') => {
    return isPlaying && currentTrack?.artist.id === artistId && queueType === type;
  };

  const isTrackPlaying = (trackId: string) => {
    return isPlaying && currentTrack?.id === trackId;
  };

  const isAlbumPlaying = (albumId: string) => {
    return isPlaying && currentTrack?.album?.id === albumId && queueType === 'album';
  };
  
  return (
    <div
      className="min-h-screen w-full rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, 
              ${dominantColor} 0%, 
              ${dominantColor}99 15%, 
              ${dominantColor}40 30%, 
              ${theme === 'light' ? '#ffffff' : '#121212'} 100%)`
          : theme === 'light'
          ? 'linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)'
          : 'linear-gradient(180deg, #2c2c2c 0%, #121212 100%)',
      }}
    >
      <div>
        {/* Genre Banner */}
        <div
          className="relative w-full h-[330px] flex flex-col justify-between rounded-t-lg px-4 md:px-6 py-6 mb-6"
          style={{ backgroundColor: dominantColor || undefined }}
        >
          {/* Header with Back button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                theme === 'light'
                  ? 'bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm hover:shadow'
                  : 'bg-black/20 hover:bg-black/30 text-white/80 hover:text-white'
              }`}
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>
          </div>

          {/* Genre Title */}
          <h1
            className={`text-4xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-md`}
            style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
          >
            {genreName}
          </h1>
        </div>

        {/* Top Artists Section */}
        {topArtists.length > 0 && (
          <section className="px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                Most Streamed {genreName} Artists
              </h2>
              <button 
                className="flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors hover:underline focus:outline-none"
                onClick={() => router.push(`/seeall?type=genre-top-artists&id=${id}`)}
              >
                See all<Right className="w-3 h-3 inline-block ml-1" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
              {topArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="hover:bg-white/10 p-4 rounded-xl group cursor-pointer transition-all duration-300"
                  onClick={() => router.push(`/artist/profile/${artist.id}`)}
                >
                  <div className="relative overflow-hidden">
                    <div className="relative rounded-full overflow-hidden mb-4 shadow-lg aspect-square">
                      <img
                        src={artist.avatar || '/images/default-avatar.jpg'}
                        alt={artist.artistName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300"/>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArtistPlay(artist, 'topArtist', e);
                      }}
                      className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] shadow-md 
                                 opacity-0 group-hover:opacity-100 transition-all duration-300 
                                 hover:bg-[#8D6553]"
                      aria-label={isArtistPlaying(artist.id, 'topArtist') ? "Pause" : "Play"}
                    >
                      {isArtistPlaying(artist.id, 'topArtist') ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </button>
                  </div>
                  
                  <h3 className={`font-semibold text-base truncate mb-1 transition-colors ${
                    isArtistPlaying(artist.id, 'topArtist') && queueType === 'topArtist'
                      ? 'text-[#A57865]'
                      : 'text-white'
                  }`}>
                    {artist.artistName}
                  </h3>
                  
                  <p className="text-white/60 text-sm truncate">
                    {new Intl.NumberFormat('en-US').format(artist.monthlyListeners)} monthly listeners
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Tracks Section */}
        {topTracks.length > 0 && (
          <section className="px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                Most Listened {genreName} Tracks
              </h2>
              <button 
                className="flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors hover:underline focus:outline-none"
                onClick={() => router.push(`/seeall?type=genre-top-tracks`)}
              >
                See all<Right className="w-3 h-3 inline-block ml-1" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {topTracks.slice(0, 8).map((track) => (
                <div
                  key={track.id}
                  className="rounded-xl group cursor-pointer transition-all duration-300"
                  onClick={() => {
                    if (track.album?.id) {
                      router.push(`/album/${track.album.id}`);
                    } else {
                      router.push(`/track/${track.id}`);
                    }
                  }}
                >
                  <div className="relative aspect-square rounded-md overflow-hidden mb-3">
                    <img
                      src={track.coverUrl || '/images/default-cover.jpg'}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300"/>
                    
                    {/* Play/Pause Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackPlay(track, 'topTracks', topTracks);
                      }}
                      className="absolute bottom-2 left-2 p-2 rounded-full bg-[#A57865] shadow-md 
                               opacity-0 group-hover:opacity-100 transition-all duration-300 
                               hover:bg-[#8D6553]"
                      aria-label={isTrackPlaying(track.id) ? "Pause" : "Play"}
                    >
                      {isTrackPlaying(track.id) && section === 'topTracks' ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      )}
                    </button>
                    
                    {/* More Options Button */}
                    <div 
                      className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/40 
                                       opacity-0 group-hover:opacity-100 transition-all duration-200"
                            aria-label="More options"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="start" 
                          className="w-56 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-xl rounded-lg"
                        >
                          <DropdownMenuItem
                            className="cursor-pointer flex items-center px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToQueue(track);
                            }}
                          >
                            <ListMusic className="w-4 h-4 mr-3 text-white/70" />
                            Add to Queue
                          </DropdownMenuItem>
                          
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10">
                              <AddSimple className="w-4 h-4 mr-3 text-white/70" />
                              Add to Playlist
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="w-52 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-xl rounded-lg">
                                {playlists.length === 0 ? (
                                  <DropdownMenuItem disabled className="px-3 py-2 text-sm text-white/50">
                                    No playlists available
                                  </DropdownMenuItem>
                                ) : (
                                  playlists.map((playlist) => (
                                    <DropdownMenuItem
                                      key={playlist.id}
                                      className="px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10"
                                      onClick={() => handleAddToPlaylist(playlist.id, track.id)}
                                    >
                                      <div className="flex items-center gap-3 w-full">
                                        <div className="w-7 h-7 relative flex-shrink-0 rounded overflow-hidden">
                                          {playlist.coverUrl ? (
                                            <img
                                              src={playlist.coverUrl}
                                              alt={playlist.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                              <svg
                                                className="w-4 h-4 text-white/70"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                        <span className="truncate font-medium">{playlist.name}</span>
                                      </div>
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuItem
                            className="cursor-pointer flex items-center px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(
                                track.id,
                                favoriteTrackIds.has(track.id)
                              );
                            }}
                          >
                            <Heart
                              className="w-4 h-4 mr-3 text-white/70"
                              fill={
                                favoriteTrackIds.has(track.id) ? "currentColor" : "none"
                              }
                            />
                            {favoriteTrackIds.has(track.id)
                              ? "Remove from Favorites"
                              : "Add to Favorites"}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="my-1 h-px bg-white/10" />
                          
                          <DropdownMenuItem className="cursor-pointer flex items-center px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10">
                            <Share2 className="w-4 h-4 mr-3 text-white/70" />
                            Share
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <h3 
                    className={`font-semibold text-sm truncate mb-1 transition-colors ${
                    isTrackPlaying(track.id) && section === 'topTracks'
                      ? 'text-[#A57865]'
                      : 'text-white'
                  }`}>
                    {track.title}
                  </h3>
                  
                  <p 
                    className="text-white/60 text-xs truncate hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/artist/profile/${track.artist.id}`);
                    }}
                  >
                    {track.artist.artistName || "Unknown Artist"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Newest Tracks Section */}
        {newestTracks.length > 0 && (
          <section className="px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                {genreName} New Releases
              </h2>
              <button 
                className="flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors hover:underline focus:outline-none"
                onClick={() => router.push(`/seeall?type=genre-new-releases`)}
              >
                See all<Right className="w-3 h-3 inline-block ml-1" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {newestTracks.slice(0, 8).map((track) => (
                <div
                  key={track.id}
                  className="rounded-xl group cursor-pointer transition-all duration-300"
                  onClick={() => {
                    if (track.album?.id) {
                      router.push(`/album/${track.album.id}`);
                    } else {
                      router.push(`/track/${track.id}`);
                    }
                  }}
                >
                  <div className="relative aspect-square rounded-md overflow-hidden mb-3">
                    <img
                      src={track.coverUrl || '/images/default-cover.jpg'}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300"/>
                    
                    {/* Play/Pause Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackPlay(track, 'newestTracks', newestTracks);
                      }}
                      className="absolute bottom-2 left-2 p-2 rounded-full bg-[#A57865] shadow-md 
                               opacity-0 group-hover:opacity-100 transition-all duration-300 
                               hover:bg-[#8D6553]"
                      aria-label={isTrackPlaying(track.id) ? "Pause" : "Play"}
                    >
                      {isTrackPlaying(track.id) && section === 'newestTracks' ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white" />
                      )}
                    </button>
                    
                    {/* More Options Button */}
                    <div 
                      className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/40 
                                       opacity-0 group-hover:opacity-100 transition-all duration-200"
                            aria-label="More options"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="start" 
                          className="w-56 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-xl rounded-lg"
                        >
                          <DropdownMenuItem
                            className="cursor-pointer flex items-center px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToQueue(track);
                            }}
                          >
                            <ListMusic className="w-4 h-4 mr-3 text-white/70" />
                            Add to Queue
                          </DropdownMenuItem>
                          
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10">
                              <AddSimple className="w-4 h-4 mr-3 text-white/70" />
                              Add to Playlist
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="w-52 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-xl rounded-lg">
                                {playlists.length === 0 ? (
                                  <DropdownMenuItem disabled className="px-3 py-2 text-sm text-white/50">
                                    No playlists available
                                  </DropdownMenuItem>
                                ) : (
                                  playlists.map((playlist) => (
                                    <DropdownMenuItem
                                      key={playlist.id}
                                      className="px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10"
                                      onClick={() => handleAddToPlaylist(playlist.id, track.id)}
                                    >
                                      <div className="flex items-center gap-3 w-full">
                                        <div className="w-7 h-7 relative flex-shrink-0 rounded overflow-hidden">
                                          {playlist.coverUrl ? (
                                            <img
                                              src={playlist.coverUrl}
                                              alt={playlist.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                              <svg
                                                className="w-4 h-4 text-white/70"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                        <span className="truncate font-medium">{playlist.name}</span>
                                      </div>
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          
                          <DropdownMenuItem
                            className="cursor-pointer flex items-center px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(
                                track.id,
                                favoriteTrackIds.has(track.id)
                              );
                            }}
                          >
                            <Heart
                              className="w-4 h-4 mr-3 text-white/70"
                              fill={
                                favoriteTrackIds.has(track.id) ? "currentColor" : "none"
                              }
                            />
                            {favoriteTrackIds.has(track.id)
                              ? "Remove from Favorites"
                              : "Add to Favorites"}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="my-1 h-px bg-white/10" />
                          
                          <DropdownMenuItem className="cursor-pointer flex items-center px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10">
                            <Share2 className="w-4 h-4 mr-3 text-white/70" />
                            Share
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <h3 className={`font-semibold text-sm truncate mb-1 transition-colors ${
                    isTrackPlaying(track.id)  && section === 'newestTracks'
                      ? 'text-[#A57865]'
                      : 'text-white'
                  }`}>
                    {track.title}
                  </h3>
                  
                  <p 
                    className="text-white/60 text-xs truncate hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/artist/profile/${track.artist.id}`);
                    }}
                  >
                    {track.artist.artistName || "Unknown Artist"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Albums Section */}
        {topAlbums.length > 0 && (
          <section className="px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                Popular {genreName} Albums
              </h2>
              <button 
                className="flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors hover:underline focus:outline-none"
                onClick={() => router.push(`/seeall?type=genre-top-albums`)}
              >
                See all<Right className="w-3 h-3 inline-block ml-1" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {topAlbums.slice(0, 8).map((album) => (
                <div
                  key={album.id}
                  className="cursor-pointer rounded-lg group relative"
                  onClick={() => router.push(`/album/${album.id}`)}
                >
                  <div className="relative">
                    <img
                      src={album.coverUrl || '/images/default-album.png'}
                      alt={album.title}
                      className="w-full aspect-square object-cover rounded-md mb-4"
                    />
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAlbumPlay(album);
                      }}
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {currentTrack &&
                      album.tracks.some(
                        (track) => track.id === currentTrack.id
                      ) &&
                      isPlaying &&
                      queueType === 'album' ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  <h3
                    className={`font-medium truncate ${
                      isAlbumPlaying(album.id) && queueType === 'album'
                        ? 'text-[#A57865]'
                        : 'text-white'
                    }`}
                  >
                    {album.title}
                  </h3>
                  <p 
                    className="text-white/60 text-sm truncate hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/artist/profile/${album.artist.id}`);
                    }}
                  >
                    {album.artist.artistName}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}