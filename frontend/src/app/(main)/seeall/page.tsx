"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/user/track/TrackCard";
import Image from "next/image";
import { api } from "@/utils/api";
import { Play } from "@/components/ui/Icons";
const token = localStorage.getItem('userToken');


const typeConfig = {
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
  // Add more as needed
} as const;

type SeeAllType = keyof typeof typeConfig;

export default function SeeAllPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") || "") as SeeAllType;
  const config = typeConfig[type];
  const router = useRouter();

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
  }, [type, config]);

  const handleCardClick = (item: any, itemType: string) => {
    if (itemType === "album") {
      router.push(`/album/${item.id}`);
    } else if (itemType === "track") {
      if (item.album?.id) {
        router.push(`/album/${item.album.id}`);
      } else {
        router.push(`/track/${item.id}`);
      }
    } else if (itemType === "playlist") {
      router.push(`/playlist/${item.id}`);
    }
  };

  const handleArtistClick = (e: React.MouseEvent, artistId: string) => {
    e.stopPropagation(); // Prevent card click
    router.push(`/artist/${artistId}`);
  };

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
              {config.itemType === "album" && (
                <div>
                  <div className="relative mb-2">
                    <Image
                      src={item.coverUrl || "/images/default-album.jpg"}
                      alt={item.title}
                      width={160}
                      height={160}
                      className="rounded object-cover w-full h-full group-hover:brightness-50 transition-all duration-300"
                    />
                    <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#A57865] rounded-full p-3">
                      <Play className="w-6 h-6 text-white" fill="white" />
                    </button>
                  </div>
                  <CardTitle className="text-base text-start line-clamp-2 mb-1 truncate">
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
                </div>
              )}
              {config.itemType === "track" && (
                <div>
                  <div className="relative mb-2">
                    <Image
                      src={item.coverUrl || "/images/default-track.jpg"}
                      alt={item.title}
                      width={160}
                      height={160}
                      className="rounded object-cover w-full h-full group-hover:brightness-50 transition-all duration-300"
                    />
                    <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#A57865] rounded-full p-3">
                      <Play className="w-6 h-6 text-white" fill="white" />
                    </button>
                  </div>
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
                </div>
              )}
              {config.itemType === "playlist" && (
                <div>
                  <div className="relative mb-2">
                    <Image
                      src={item.coverUrl || "/images/default-playlist.jpg"}
                      alt={item.name}
                      width={160}
                      height={160}
                      className="rounded object-cover w-full h-full group-hover:brightness-50 transition-all duration-300"
                    />
                    <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#A57865] rounded-full p-3">
                      <Play className="w-6 h-6 text-white" fill="white" />
                    </button>
                  </div>
                  <CardTitle className="text-base text-start line-clamp-2 mb-1">
                    {item.name}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground text-start line-clamp-1">
                    {item.totalTracks} tracks
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
