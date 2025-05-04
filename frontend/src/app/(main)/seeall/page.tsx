"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardTitle } from "@/components/user/track/TrackCard";
import Image from "next/image";
import { api } from "@/utils/api";
import { Play, Pause } from "@/components/ui/Icons";
import { usePlayHandler } from "@/hooks/usePlayHandler";
import { useTrack } from "@/contexts/TrackContext";
import { Artist, Playlist } from "@/types";

type SeeAllType = "new-albums" | "top-albums" | "top-tracks" | "recently-played" | 
                 "trending-playlists" | "user-top-artists" | "genre-top-tracks" | 
                 "genre-new-releases" | "genre-top-albums" | "genre-top-artists";

export default function SeeAllPage() {
  const token = localStorage.getItem('userToken');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") || "") as SeeAllType;
  const router = useRouter();
  const { currentTrack, isPlaying, queueType, trackQueue, queue } = useTrack();

  const [genreDataState, setGenreDataState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genreData') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        setGenreDataState(JSON.parse(localStorage.getItem('genreData') || '{}'));
      } catch {
        setGenreDataState({});
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const typeConfig = useMemo(() => ({
    "new-albums": {
      fetcher: () => api.albums.getNewestAlbums(),
      title: "New Albums",
      itemType: "album" as const,
    },
    "top-albums": {
      fetcher: () => api.albums.getHotAlbums(token || ''),
      title: "Top Albums",
      itemType: "album" as const,
    },
    "top-tracks": {
      fetcher: () => api.user.getTopTracks(token || ''),
      title: "Top Tracks",
      itemType: "track" as const,
    },
    "recently-played": {
      fetcher: () => api.user.getPlayHistory(token || ''),
      title: "Recently Played",
      itemType: "track" as const,
    },
    "trending-playlists": {
      fetcher: () => api.playlists.getSystemPlaylists(token || ''),
      title: "Trending Playlists",
      itemType: "playlist" as const,
    },
    "user-top-artists": {
      fetcher: () => api.user.getUserTopArtists(userData.id ,token || ''),
      title: "Top Artists",
      itemType: "artist" as const,
    },
    "genre-top-tracks": {
      fetcher: () => api.user.getGenreTopTracks(genreDataState.id, token || ''),
      title: `Most Listened ${genreDataState.name} Tracks`,
      itemType: "track" as const,
    },
    "genre-new-releases": {
      fetcher: () => api.user.getGenreNewestTracks(genreDataState.id, token || ''),
      title: `${genreDataState.name} New Releases`,
      itemType: "track" as const,
    },
    "genre-top-albums": {
      fetcher: () => api.user.getGenreTopAlbums(genreDataState.id, token || ''),
      title: `Popular ${genreDataState.name} Albums`,
      itemType: "album" as const,
    },
    "genre-top-artists": {
      fetcher: () => api.user.getGenreTopArtists(genreDataState.id, token || ''),
      title: `Most Listened ${genreDataState.name} Artists`,
      itemType: "artist" as const,
    },
  }), [genreDataState.id, genreDataState.name]);

  const config = useMemo(() => typeConfig[type], [typeConfig, type]);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    setError(null);
    config.fetcher()
      .then((data) => {
        setItems(Array.isArray(data) ? data : data[Object.keys(data)[0]] || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [type, config, genreDataState.id]);

  const handleCardClick = (item: any, itemType: string) => {
    if (itemType === "album") {
      router.push(`/album/${item.id}`);
    } else if (itemType === "track") {
      if (item.album) {
        router.push(`/album/${item.album.id}`);
      } else {
        router.push(`/track/${item.id}`);
      }
    } else if (itemType === "playlist") {
      router.push(`/playlist/${item.id}`);
    } else if (itemType === "artist") {
      router.push(`/artist/profile/${item.id}`);
    }
  };

  const handleArtistClick = (e: React.MouseEvent, artistId: string) => {
    e.stopPropagation();
    router.push(`/artist/profile/${artistId}`);
  };

  function isPlaylistPlaying(playlist:Playlist) {
    if (queueType !== "playlist" || !isPlaying) return false;
    if (!playlist.tracks || playlist.tracks.length !== trackQueue.length) return false;
    for (let i = 0; i < playlist.tracks.length; i++) {
      if (playlist.tracks[i].id !== queue[i].id) return false;
    }
    return true;
  }

  console.log ('items', items);
  function isArtistPlaying(artist:Artist) {
    return (
      isPlaying &&
      queueType === "artist" &&
      currentTrack &&
      currentTrack.artist?.id === artist.id
    );
  }

  const handlePlay = usePlayHandler({ tracks: items });

  if (!config) return <div className="p-8">Invalid type</div>;
  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">{config.title}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {items.map((item) => (
          <Card 
            key={item.id} 
            className="overflow-hidden group cursor-pointer" 
            onClick={() => handleCardClick(item, config.itemType)}
          >
            <CardContent className="flex flex-col p-4">
              {(config.itemType === "album" || config.itemType === "track" || config.itemType === "playlist" || config.itemType === "artist") && (
                <div>
                  <div className="relative mb-4">
                    <Image
                      src={item.coverUrl || item.avatar || `/images/default-${config.itemType}.jpg`}
                      alt={item.title || item.name || item.artistName}
                      width={160}
                      height={160}
                      className={`rounded object-cover w-full h-full group-hover:brightness-50 transition-all duration-300 aspect-square ${config.itemType === "artist" ? "rounded-full" : ""}`}
                    />
                    <button 
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#A57865] rounded-full p-3"
                      onClick={(e) => { e.stopPropagation(); handlePlay(item); }}
                    >
                      {/* Track */}
                      {config.itemType === "track" && currentTrack?.id === item.id && isPlaying && queueType === "track" ? (
                        <Pause className="w-6 h-6 text-white" fill="white" />
                      ) : /* Album */
                      config.itemType === "album" && item.tracks?.some((t:any) => t.id === currentTrack?.id) && isPlaying && queueType === "album" ? (
                        <Pause className="w-6 h-6 text-white" fill="white" />
                      ) : /* Playlist (Chưa có cái nào sử dụng chưa test)*/
                      config.itemType === "playlist" && isPlaylistPlaying(item) ? (
                        <Pause className="w-6 h-6 text-white" fill="white" />
                      ) : /* Artist */
                      config.itemType === "artist" && isArtistPlaying(item) ? (
                        <Pause className="w-6 h-6 text-white" fill="white" />
                      ) : (
                        <Play className="w-6 h-6 text-white" fill="white" />
                      )}
                    </button>
                  </div>
                  {config.itemType === "album" && (
                    <>
                      <CardTitle className="text-base text-start line-clamp-2 mb-1">
                        {item.title}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground text-start line-clamp-1">
                        {item.artist && (
                          <span 
                            className="hover:underline cursor-pointer" 
                            onClick={(e) => handleArtistClick(e, item.artist.id)}
                          >
                            {item.artist.artistName}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {config.itemType === "track" && (
                    <>
                      <CardTitle className="text-base text-start line-clamp-2 mb-1">
                        {item.title}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground text-start line-clamp-1">
                        {item.artist && (
                          <span 
                            className="hover:underline cursor-pointer" 
                            onClick={(e) => handleArtistClick(e, item.artist.id)}
                          >
                            {item.artist.artistName}
                          </span>
                        )}
                        {item.featuredArtists?.length > 0 && (
                          <>
                            {", "}
                            {item.featuredArtists
                              .map((fa: any, index: number) => (
                                <span 
                                  key={fa.artistProfile?.id || index} 
                                  className="hover:underline cursor-pointer"
                                  onClick={(e) => fa.artistProfile?.id && handleArtistClick(e, fa.artistProfile.id)}
                                >
                                  {fa.artistProfile?.artistName}
                                  {index < item.featuredArtists.length - 1 ? ", " : ""}
                                </span>
                              ))
                              .filter(Boolean)}
                          </>
                        )}
                      </div>
                    </>
                  )}
                  {config.itemType === "playlist" && (
                    <>
                      <CardTitle className="text-base text-start line-clamp-2 mb-1">
                        {item.name}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground text-start line-clamp-1">
                        {item.totalTracks} tracks
                      </div>
                    </>
                  )}
                  {config.itemType === "artist" && (
                    <>
                      <CardTitle className="text-base text-start line-clamp-2 mb-1">
                        {item.artistName}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground text-start line-clamp-1">
                        {item.monthlyListeners} monthly listeners
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
