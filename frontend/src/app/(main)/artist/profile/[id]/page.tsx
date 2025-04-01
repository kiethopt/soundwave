'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, AlbumType, ArtistProfile, Track } from '@/types';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useDominantColor } from '@/hooks/useDominantColor';
import { Verified, Play, Pause, Edit } from '@/components/ui/Icons';
import { ArrowLeft } from 'lucide-react';
import { useTrack } from '@/contexts/TrackContext';
import HorizontalTrackListItem from '@/components/user/track/HorizontalTrackListItem';
import { EditArtistProfileModal } from '@/components/ui/data-table/data-table-modals';
import Image from 'next/image';

function getBrightness(hexColor: string) {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export default function ArtistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useTheme();
  const { id } = use(params);
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [standaloneReleases, setStandaloneReleases] = useState<Track[]>([]);
  const [artistTracksMap, setArtistTracksMap] = useState<
    Record<string, Track[]>
  >({});
  const [relatedArtists, setRelatedArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [follow, setFollow] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const { dominantColor } = useDominantColor(
    artist?.artistBanner || artist?.avatar || ''
  );
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'albums' | 'singles'>(
    'popular'
  );

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
  } = useTrack();

  const token = localStorage.getItem('userToken') || '';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const displayedTracks = showAllTracks ? tracks : tracks.slice(0, 5);

  const fetchData = useCallback(async () => {
    if (!token || !id) return;

    setLoading(true);
    try {
      const [
        artistData,
        followingResponse,
        albumsResponse,
        tracksResponse,
        singlesResponse,
        relatedArtistsResponse,
      ] = await Promise.all([
        api.artists.getProfile(id, token),
        api.user.getFollowing(token),
        api.artists.getAlbumByArtistId(id, token),
        api.artists.getTrackByArtistId(id, token),
        api.artists.getTrackByArtistId(id, token, 'SINGLE'),
        api.artists.getRelatedArtists(id, token),
      ]);

      setArtist(artistData);

      if (followingResponse) {
        const isFollowing = followingResponse.some(
          (artistProfile: ArtistProfile) => artistProfile.id === id
        );
        const isOwner = userData.artistProfile?.id === id;
        setFollow(isFollowing);
        setIsOwner(isOwner);
      }

      setAlbums(albumsResponse.albums);

      // Sort tracks by play count
      const sortedTracks = tracksResponse.tracks.sort(
        (a: any, b: any) => b.playCount - a.playCount
      );
      setTracks(sortedTracks);

      // Find standalone tracks (singles or EPs not in albums)
      const singleAndEPs = singlesResponse.tracks.filter(
        (track: Track) => !track.album
      );
      setStandaloneReleases(singleAndEPs);

      setRelatedArtists(relatedArtistsResponse);

      if (relatedArtistsResponse?.length > 0) {
        const tracksMap = await fetchRelatedArtistTracks(
          relatedArtistsResponse
        );
        setArtistTracksMap(tracksMap);
      }
    } catch (error) {
      console.error('Error fetching artist data:', error);
      toast.error('Failed to load artist data');
    } finally {
      setLoading(false);
    }
  }, [id, token, userData.artistProfile?.id]);

  const fetchRelatedArtistTracks = async (artists: ArtistProfile[]) => {
    const tracksMap: Record<string, Track[]> = {};
    if (!token) {
      return tracksMap;
    }

    await Promise.all(
      artists.map(async (artist) => {
        try {
          const data = await api.artists.getTrackByArtistId(artist.id, token);
          tracksMap[artist.id] = data.tracks.sort(
            (a: any, b: any) => b.playCount - a.playCount
          );
        } catch (error) {
          console.error(
            `Error fetching tracks for artist ${artist.id}:`,
            error
          );
          tracksMap[artist.id] = [];
        }
      })
    );

    return tracksMap;
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData(); // Call the fetchData function
  }, [token, router, fetchData]);

  const handleFollow = async () => {
    if (!token) {
      router.push('/login');
    } else {
      try {
        if (follow) {
          await api.user.unfollowUserOrArtist(id, token);
          toast.success('Unfollowed artist!');
          setFollow(false);
        } else {
          await api.user.followUserOrArtist(id, token);
          toast.success('Followed artist!');
          setFollow(true);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to follow artist!');
      }
    }
  };

  const handleTopTrackPlay = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying && queueType === 'track') {
      pauseTrack();
    } else {
      playTrack(track);
      setQueueType('track');
      trackQueue(tracks);
    }
  };

  const handleArtistPlay = async (
    artist: ArtistProfile,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      let artistTracks = artistTracksMap[artist.id] || [];

      if (!artistTracks.length) {
        artistTracks = await getArtistTracks(artist.id);

        setArtistTracksMap((prev) => ({
          ...prev,
          [artist.id]: artistTracks,
        }));
      }

      if (artistTracks.length > 0) {
        if (isArtistPlaying(artist.id)) {
          pauseTrack();
        } else {
          playTrack(artistTracks[0]);
          setQueueType('artist');
          trackQueue(artistTracks);
        }
      } else {
        toast.error('No tracks available for this artist');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load artist tracks');
    }
  };

  const handleAlbumPlay = async (album: Album, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Kiểm tra nếu album có tracks
      if (album.tracks?.length > 0) {
        // Nếu đang phát album này thì pause
        const isCurrentAlbumPlaying =
          isPlaying &&
          currentTrack &&
          album.tracks.some((track) => track.id === currentTrack.id) &&
          queueType === 'album';

        if (isCurrentAlbumPlaying) {
          pauseTrack();
        } else {
          // Nếu không thì phát track đầu tiên và set queue là toàn bộ tracks của album
          playTrack(album.tracks[0]);
          setQueueType('album');
          trackQueue(album.tracks);
        }
      } else {
        toast.error('No tracks available for this album');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load album tracks');
    }
  };

  // Sửa lại hàm getArtistTracks để sử dụng cache từ state
  const getArtistTracks = async (artistId: string) => {
    // Nếu đã có trong cache, trả về luôn
    if (artistTracksMap[artistId]?.length > 0) {
      return artistTracksMap[artistId];
    }

    // Nếu chưa có, fetch mới
    try {
      const data = await api.artists.getTrackByArtistId(artistId, token);
      const sortedTracks = data.tracks.sort(
        (a: any, b: any) => b.playCount - a.playCount
      );

      // Cập nhật cache
      setArtistTracksMap((prev) => ({
        ...prev,
        [artistId]: sortedTracks,
      }));

      return sortedTracks;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const isArtistPlaying = (artistId: string) => {
    const artistTracks = artistTracksMap[artistId] || [];
    return (
      currentTrack &&
      artistTracks.some((track) => track.id === currentTrack.id) &&
      isPlaying &&
      queueType === 'artist'
    );
  };

  const textColor =
    dominantColor && getBrightness(dominantColor) > 200 ? '#3c3c3c' : '#fff';

  // Filter albums based on the active tab
  const filteredReleases = albums.filter((item) => {
    if (activeTab === 'albums') {
      return item.type === AlbumType.ALBUM;
    } else if (activeTab === 'singles') {
      return item.type === AlbumType.SINGLE || item.type === AlbumType.EP;
    }
    return true; // 'popular' shows all
  });

  // Get content based on active tab
  const displayTabContent = () => {
    if (activeTab === 'singles' && standaloneReleases.length > 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
          {standaloneReleases.map((track) => (
            <div
              key={track.id}
              className="bg-white/5 p-4 rounded-lg group relative w-full"
              onClick={() => router.push(`/track/${track.id}`)}
            >
              <div className="relative">
                <img
                  src={track.coverUrl || '/images/default-track.png'}
                  alt={track.title}
                  className="w-full aspect-square object-cover rounded-md mb-4"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTopTrackPlay(track);
                  }}
                  className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <h3
                className={`font-medium truncate ${
                  theme === 'light' ? 'text-neutral-800' : 'text-white'
                } ${
                  currentTrack?.id === track.id
                    ? 'text-[#A57865]'
                    : theme === 'light'
                    ? 'text-neutral-800'
                    : 'text-white'
                }`}
              >
                {track.title}
              </h3>
              <p
                className={`text-sm truncate ${
                  theme === 'light' ? 'text-neutral-600' : 'text-white/60'
                }`}
              >
                {track.releaseDate.substring(0, 4)} •{' '}
                {track.type.charAt(0).toUpperCase() +
                  track.type.slice(1).toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
        {filteredReleases.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 p-4 rounded-lg group relative w-full"
            onClick={() => router.push(`/album/${item.id}`)}
          >
            <div className="relative">
              <img
                src={item.coverUrl || '/images/default-album.png'}
                alt={item.title}
                className="w-full aspect-square object-cover rounded-md mb-4"
              />
              <button
                onClick={(e) => {
                  handleAlbumPlay(item, e);
                }}
                className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {item.tracks &&
                item.tracks.some(
                  (track) =>
                    track.id === currentTrack?.id &&
                    isPlaying &&
                    queueType === 'album'
                ) ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
            <h3
              className={`font-medium truncate ${
                theme === 'light' ? 'text-neutral-800' : 'text-white'
              } ${
                currentTrack &&
                item.tracks &&
                item.tracks.some(
                  (track) =>
                    track.id === currentTrack.id && queueType === 'album'
                )
                  ? 'text-[#A57865]'
                  : theme === 'light'
                  ? 'text-neutral-800'
                  : 'text-white'
              }`}
            >
              {item.title}
            </h3>
            <p
              className={`text-sm truncate ${
                theme === 'light' ? 'text-neutral-600' : 'text-white/60'
              }`}
            >
              {item.releaseDate.substring(0, 4)} •{' '}
              {item.type.charAt(0).toUpperCase() +
                item.type.slice(1).toLowerCase()}
            </p>
          </div>
        ))}
      </div>
    );
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
      {artist && (
        <div>
          {/* Artist Banner */}
          <div className="relative w-full h-[370px] rounded-t-lg overflow-hidden">
            {artist.artistBanner ? (
              <Image
                src={artist.artistBanner}
                alt={`${artist.artistName} banner`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: dominantColor || '#121212' }}
              />
            )}

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-between px-4 md:px-6 py-6 z-10">
              <div className="flex items-center justify-between w-full">
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

                {isOwner && (
                  <button
                    onClick={() => setIsEditOpen(true)}
                    className={`p-2 rounded-lg transition-all ${
                      theme === 'light'
                        ? 'bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm hover:shadow'
                        : 'bg-black/20 hover:bg-black/30 text-white/80 hover:text-white'
                    }`}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  {artist.isVerified && <Verified className="w-6 h-6" />}
                  {artist.isVerified && (
                    <span
                      className="text-sm font-semibold"
                      style={{ lineHeight: '1.1', color: textColor }}
                    >
                      Verified Artist
                    </span>
                  )}
                </div>
                <h1
                  className="text-6xl font-bold uppercase py-4"
                  style={{ lineHeight: '1.1', color: textColor }}
                >
                  {artist.artistName}
                </h1>
                <span
                  className="text-base font-semibold py-6"
                  style={{ lineHeight: '1.1', color: textColor }}
                >
                  {new Intl.NumberFormat('en-US').format(
                    artist.monthlyListeners
                  )}{' '}
                  monthly listeners
                </span>
              </div>
            </div>
          </div>

          {/* Artist Controls */}
          <div className="px-4 md:px-6 py-6">
            <div className="flex items-center gap-5">
              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  if (tracks.length > 0) {
                    if (
                      isPlaying &&
                      queueType === 'track' &&
                      currentTrack?.artistId === artist?.id
                    ) {
                      pauseTrack();
                    } else {
                      playTrack(tracks[0]);
                      setQueueType('track');
                      trackQueue(tracks);
                    }
                  }
                }}
                className="p-3 rounded-full bg-[#A57865] hover:bg-[#8a5f4d] transition-colors duration-200"
              >
                {isPlaying &&
                queueType === 'track' &&
                currentTrack?.artistId === artist?.id ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Follow Button (Can't self follow) */}
              {!isOwner && (
                <Button
                  variant={theme === 'dark' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handleFollow}
                  className="flex-shrink-0 justify-center min-w-[80px]"
                >
                  {follow ? 'Unfollow' : 'Follow'}
                </Button>
              )}
            </div>
          </div>

          {/* Track Section */}
          <div className="px-4 md:px-6 py-6 flex flex-col-reverse md:flex-row gap-4 lg:gap-12">
            {tracks.length > 0 && (
              <div className="flex-grow mt-4 md:mt-0">
                <h2 className="text-2xl font-bold">Popular Tracks</h2>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  {displayedTracks.map((track, index) => (
                    <HorizontalTrackListItem
                      key={track.id}
                      track={track}
                      index={index}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      playCount={true}
                      albumTitle={false}
                      queueType={queueType}
                      theme={theme}
                      onTrackClick={() => {
                        handleTopTrackPlay(track);
                      }}
                    />
                  ))}
                </div>

                {/* "See More" Button */}
                {tracks.length > 5 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowAllTracks(!showAllTracks)}
                      className="text-[#A57865] hover:underline"
                    >
                      {showAllTracks ? 'See Less' : 'See More'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* About Section */}
            <div className="flex-grow">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">About</h2>
              </div>
              <p
                className={`mt-2 ${
                  theme === 'light' ? 'text-neutral-700' : 'text-white/60'
                }`}
              >
                {artist.bio || 'No biography available'}
              </p>
            </div>
          </div>

          {/* Discography Section */}
          {(albums.length > 0 || standaloneReleases.length > 0) && (
            <div className="px-4 md:px-6 py-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Discography</h2>
                {/* Add "Show all" text - no functionality for now */}
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 cursor-pointer hover:underline">
                  Show all
                </span>
              </div>

              {/* Tab Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={activeTab === 'popular' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('popular')}
                >
                  Popular releases
                </Button>
                <Button
                  variant={activeTab === 'albums' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('albums')}
                >
                  Albums
                </Button>
                <Button
                  variant={activeTab === 'singles' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('singles')}
                >
                  Singles and EPs
                </Button>
              </div>

              {displayTabContent()}
            </div>
          )}

          {/* Related Artists Section */}
          {relatedArtists.length > 0 && (
            <div className="px-4 md:px-6 py-6">
              <h2 className="text-2xl font-bold">Related Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                {relatedArtists.map((relatedArtist) => (
                  <div
                    key={relatedArtist.id}
                    className="hover:bg-white/5 p-4 rounded-lg group relative w-full"
                    onClick={() =>
                      router.push(`/artist/profile/${relatedArtist.id}`)
                    }
                  >
                    <div className="relative">
                      <img
                        src={
                          relatedArtist.avatar || '/images/default-avatar.jpg'
                        }
                        alt={relatedArtist.artistName}
                        className="w-full aspect-square object-cover rounded-full mb-4"
                      />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          handleArtistPlay(relatedArtist, e);
                        }}
                        className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isArtistPlaying(relatedArtist.id) ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                    <h3
                      className={`font-medium truncate dark:text-white ${
                        artistTracksMap[relatedArtist.id]?.some(
                          (track) => track.id === currentTrack?.id
                        ) && queueType === 'artist'
                          ? 'text-[#A57865]'
                          : 'text-black/60'
                      }`}
                    >
                      {relatedArtist.artistName}
                    </h3>
                    <p className="text-black/60 text-sm truncate dark:text-white/60">
                      {new Intl.NumberFormat('en-US').format(
                        relatedArtist.monthlyListeners
                      )}{' '}
                      monthly listeners
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <EditArtistProfileModal
            artistProfile={artist}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            theme={theme}
            onUpdateSuccess={() => {
              toast.success('Profile updated! Refreshing data...');
              fetchData(); // Refetch data on successful update
            }}
          />
        </div>
      )}
    </div>
  );
}
