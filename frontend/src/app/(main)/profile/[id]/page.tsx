"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useTheme } from "@/contexts/ThemeContext";
import { ArtistProfile, Track, User, Playlist } from "@/types";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useDominantColor } from "@/hooks/useDominantColor";
import { Play, Pause, Edit, Up, Down, Right } from "@/components/ui/Icons";
import { ArrowLeft, Copy, MoreHorizontal } from "lucide-react";
import { useTrack } from "@/contexts/TrackContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HorizontalTrackListItem from "@/components/user/track/HorizontalTrackListItem";
import Image from "next/image";
import { EditProfileModal } from "@/components/user/profile/EditProfileModal";
import { AlreadyExistsDialog } from "@/components/ui/AlreadyExistsDialog";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = use(params);
  const [follow, setFollow] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [following, setFollowing] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingArtists, setFollowingArtists] = useState<ArtistProfile[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [topArtists, setTopArtists] = useState<ArtistProfile[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [artistTracksMap, setArtistTracksMap] = useState<
    Record<string, Track[]>
  >({});
  const { dominantColor } = useDominantColor(user?.avatar || DEFAULT_AVATAR);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(
    new Set()
  );
  const [isAlreadyExistsDialogOpen, setIsAlreadyExistsDialogOpen] =
    useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    playlistName: string;
    trackTitle?: string;
  } | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const { handleProtectedAction } = useAuth();

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
  } = useTrack();

  useEffect(() => {
    const storedToken = localStorage.getItem("userToken");
    if (!storedToken) {
      router.push("/login");
      return;
    }
    setToken(storedToken);

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const isOwner = userData.id === id;
    setIsOwner(isOwner);

    const fetchUserData = async () => {
      try {
        const [userResponse, followingResponse, followersResponse] =
          await Promise.all([
            api.user.getUserById(id, storedToken),
            api.user.getUserFollowing(id, storedToken),
            api.user.getUserFollowers(id, storedToken),
          ]);

        if (userResponse) {
          setUser(userResponse);
        }

        if (followersResponse && followersResponse.followers) {
          setFollowers(followersResponse.followers);
          setFollowerCount(followersResponse.followers.length);
        }

        setFollowing(followingResponse);
        const followingArtists = followingResponse.filter(
          (followingUser: any) => followingUser.type === "ARTIST"
        );
        setFollowingArtists(followingArtists);

        if (!isOwner) {
          const isFollowing = followersResponse.followers.some(
            (follower: User) => follower.id === userData.id
          );
          setFollow(isFollowing);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    const fetchTopArtists = async () => {
      try {
        const topArtistsResponse = await api.user.getUserTopArtists(
          userData.id,
          storedToken
        );

        setTopArtists(topArtistsResponse);
      } catch (error) {
        console.error("Failed to fetch top artists:", error);
      }
    };

    const fetchTopTracks = async () => {
      try {
        const topTracksResponse = await api.user.getUserTopTracks(
          userData.id,
          storedToken
        );
        setTopTracks(topTracksResponse);
      } catch (error) {
        console.error("Failed to fetch top tracks:", error);
      }
    };

    fetchUserData();

    if (isOwner) {
      fetchTopArtists();
      fetchTopTracks();
    }
  }, [id, router]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "userData") {
        const updatedUser = JSON.parse(
          localStorage.getItem("userData") || "{}"
        );
        setUser((prev) => ({ ...prev, ...updatedUser }));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch logged-in user's playlists and favorite IDs
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return; // Only fetch if logged in

    // Fetch playlists
    const fetchPlaylists = async () => {
      try {
        const response = await api.playlists.getUserPlaylists(token);
        if (response.success && Array.isArray(response.data)) {
          setPlaylists(response.data);
        } else {
          setPlaylists([]);
        }
      } catch (error) {
        console.error("Error fetching playlists:", error);
        setPlaylists([]);
      }
    };

    // Fetch favorite IDs
    const fetchFavoriteIds = async () => {
      try {
        const favPlaylistsResponse = await api.playlists.getUserPlaylists(
          token
        );
        if (
          favPlaylistsResponse.success &&
          Array.isArray(favPlaylistsResponse.data)
        ) {
          const favoritePlaylistInfo = favPlaylistsResponse.data.find(
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

    fetchPlaylists();
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

    // Cleanup listener
    return () => {
      window.removeEventListener("favorites-changed", handleFavoritesChanged);
    };
  }, []); // Fetch only once when component mounts

  const handleFollow = async () => {
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      if (follow) {
        await api.user.unfollowUserOrArtist(id, token);
        toast.success("Unfollowed user!");
        setFollow(false);
        // Decrement follower count
        setFollowerCount((prevCount) => Math.max(0, prevCount - 1));

        // Also update followers list (remove current user)
        const userData = JSON.parse(localStorage.getItem("userData") || "{}");
        setFollowers((prev) =>
          prev.filter((follower) => follower.id !== userData.id)
        );

        // Dispatch event for other components to know about the follow change
        window.dispatchEvent(
          new CustomEvent("follower-count-changed", {
            detail: { userId: id, isFollowing: false },
          })
        );
      } else {
        await api.user.followUserOrArtist(id, token);
        toast.success("Followed user!");
        setFollow(true);
        // Increment follower count
        setFollowerCount((prevCount) => prevCount + 1);

        // Add current user to followers (would need full user data ideally)
        const userData = JSON.parse(localStorage.getItem("userData") || "{}");
        if (userData.id && !followers.some((f) => f.id === userData.id)) {
          setFollowers((prev) => [...prev, userData]);
        }

        // Dispatch event for other components to know about the follow change
        window.dispatchEvent(
          new CustomEvent("follower-count-changed", {
            detail: { userId: id, isFollowing: true },
          })
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to follow user!");
    }
  };

  const handleTopTrackPlay = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying && queueType === "track") {
      pauseTrack();
    } else {
      setQueueType("track");
      trackQueue(topTracks);
      playTrack(track);
    }
  };

  const handleArtistPlay = async (
    artist: ArtistProfile,
    queueTypeValue: "topArtist" | "followingArtist",
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
        const isCurrentArtistPlaying =
          isPlaying &&
          currentTrack &&
          artistTracks.some((track) => track.id === currentTrack.id) &&
          queueType === queueTypeValue;

        if (isCurrentArtistPlaying) {
          pauseTrack();
        } else {
          setQueueType(queueTypeValue);
          trackQueue(artistTracks);
          playTrack(artistTracks[0]);
        }
      } else {
        toast.error("No tracks available for this artist");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load artist tracks");
    }
  };

  const getArtistTracks = async (artistId: string) => {
    try {
      if (!token) {
        throw new Error("Token is null");
      }
      const data = await api.artists.getTrackByArtistId(artistId, token);
      return data.tracks.sort((a: any, b: any) => b.playCount - a.playCount);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const isArtistPlaying = (
    artistId: string,
    queueTypeValue: "topArtist" | "followingArtist"
  ) => {
    const artistTracks = artistTracksMap[artistId] || [];
    return (
      currentTrack &&
      artistTracks.some((track) => track.id === currentTrack.id) &&
      isPlaying &&
      queueType === queueTypeValue
    );
  };

  const handleEditProfile = () => {
    setIsEditProfileModalOpen(true);
  };

  if (user && user.avatar) {
    console.log("Avatar exists:", user.avatar);
  } else {
    console.log("No avatar, using default");
  }

  return (
    <div
      className="min-h-screen w-full rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, 
              ${dominantColor} 0%, 
              ${dominantColor}99 15%, 
              ${dominantColor}40 30%, 
              ${theme === "light" ? "#ffffff" : "#121212"} 100%)`
          : theme === "light"
          ? "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)"
          : "linear-gradient(180deg, #2c2c2c 0%, #121212 100%)",
      }}
    >
      {user && (
        <div>
          {/* User Banner */}
          <div
            className="relative w-full h-[330px] flex flex-col justify-between rounded-t-lg px-4 md:px-6 py-6"
            style={{ backgroundColor: dominantColor || undefined }}
          >
            {/* Header with Back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.back()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === "light"
                    ? "bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm hover:shadow"
                    : "bg-black/20 hover:bg-black/30 text-white/80 hover:text-white"
                }`}
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex flex-row items-center justify-start w-full">
              {/* Avatar */}
              <Image
                src={user?.avatar || DEFAULT_AVATAR}
                alt={user.name || "User avatar"}
                width={192}
                height={192}
                className="w-32 h-32 md:w-48 md:h-48 rounded-full"
                priority
              />

              {/* Username */}
              <div className="flex flex-col items-start justify-center flex-1 ml-4 llg:ml-8 gap-4">
                <span className="text-sm font-semibold ">Profile</span>
                <h1
                  className={`text-4xl w-fit md:text-6xl font-bold capitalize ${
                    isOwner ? "cursor-pointer" : ""
                  }`}
                  style={{ lineHeight: "1.1" }}
                  onClick={
                    isOwner ? () => setIsEditProfileModalOpen(true) : undefined
                  }
                >
                  {user?.name || user?.username || "User"}
                </h1>
                <div>
                  {user.followVisibility === true || isOwner ? (
                    <>
                      <span
                        className="text-sm font-semibold hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/profile/${id}/followers`);
                        }}
                      >
                        {followers.length} Followers
                      </span>
                      <span className="text-xs font-semibold mx-1">•</span>
                      <span
                        className="text-sm font-semibold hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/profile/${id}/following`);
                        }}
                      >
                        {following.length} Following
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Artist Controls */}
          <div className="px-4 md:px-6 py-6">
            <div className="flex items-center gap-5">
              {/* Follow Button (Can't self follow) */}
              {!isOwner && (
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={handleFollow}
                  className="flex-shrink-0 justify-center min-w-[80px]"
                >
                  {follow ? "Unfollow" : "Follow"}
                </Button>
              )}

              {/* Option */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full px-2">
                  {isOwner && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProfile();
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(
                        `${window.location.origin}/profile/${id}`
                      );
                      toast.success("Profile link copied to clipboard!");
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Profile Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Top Artists Section */}
          {topArtists.length > 0 && (
            <div className="px-4 md:px-6 py-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Top artists this month</h2>
                <button
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors hover:underline focus:outline-none"
                  onClick={() => router.push(`/seeall?type=user-top-artists`)}
                >
                  See all
                  <Right className="w-3 h-3 inline-block ml-1" />
                </button>
              </div>
              <div className="flex space-x-4 mt-4 overflow-x-auto pb-4">
                {topArtists.slice(0, 10).map((topArtist) => (
                  <div
                    key={topArtist.id}
                    className="hover:bg-white/5 p-4 rounded-lg group relative cursor-pointer flex-shrink-0 w-[180px]"
                    onClick={() =>
                      router.push(`/artist/profile/${topArtist.id}`)
                    }
                  >
                    <div className="relative">
                      <Image
                        src={topArtist.avatar || DEFAULT_AVATAR}
                        alt={topArtist.artistName}
                        width={180}
                        height={180}
                        className="w-full aspect-square object-cover rounded-full mb-4"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArtistPlay(topArtist, "topArtist", e);
                        }}
                        className="absolute bottom-2 right-1 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isArtistPlaying(topArtist.id, "topArtist") ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                    <h3
                      className={`font-medium truncate ${
                        artistTracksMap[topArtist.id]?.some(
                          (track) => track.id === currentTrack?.id
                        ) && queueType === "topArtist"
                          ? "text-[#A57865]"
                          : "text-white"
                      }`}
                    >
                      {topArtist.artistName}
                    </h3>
                    <p className="text-white/60 text-sm truncate">
                      {new Intl.NumberFormat("en-US").format(
                        topArtist.monthlyListeners
                      )}{" "}
                      monthly listeners
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Tracks Section */}
          {topTracks.length > 0 && (
            <div className="px-4 md:px-6 py-6">
              <h2 className="text-2xl font-bold">Top tracks this month</h2>
              <div className="grid grid-cols-1 gap-4 mt-4">
                {(showAllTracks ? topTracks : topTracks.slice(0, 5)).map(
                  (track, index) => (
                    <HorizontalTrackListItem
                      key={track.id}
                      track={track}
                      index={index}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      playCount={false}
                      albumTitle={true}
                      queueType={queueType}
                      theme={theme}
                      onTrackClick={() => handleTopTrackPlay(track)}
                      playlists={playlists}
                      favoriteTrackIds={favoriteTrackIds}
                    />
                  )
                )}
              </div>

              {/* "See More" Button */}
              {topTracks.length > 5 && (
                <Button
                  variant="link"
                  className="flex items-center gap-2 mt-4"
                  onClick={() => setShowAllTracks((prev) => !prev)}
                >
                  {showAllTracks ? (
                    <Up className="w-4 h-4" />
                  ) : (
                    <Down className="w-4 h-4" />
                  )}
                  {showAllTracks ? "See less" : "See all"}
                </Button>
              )}
            </div>
          )}

          {/* Following Artists Section */}
          {followingArtists.length > 0 && user.followVisibility === true && (
            <div className="px-4 md:px-6 py-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Following artists</h2>
                <button
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors hover:underline focus:outline-none"
                  onClick={() => router.push(`/profile/${id}/following`)}
                >
                  See all
                  <Right className="w-3 h-3 inline-block ml-1" />
                </button>
              </div>
              <div className="flex space-x-4 mt-4 overflow-x-auto pb-4">
                {followingArtists.slice(0, 10).map((followArtist) => (
                  <div
                    key={followArtist.id}
                    className="hover:bg-white/5 p-4 rounded-lg group relative cursor-pointer flex-shrink-0 w-[180px]"
                    onClick={() =>
                      router.push(`/artist/profile/${followArtist.id}`)
                    }
                  >
                    <div className="relative">
                      <Image
                        src={followArtist.avatar || DEFAULT_AVATAR}
                        alt={followArtist.artistName}
                        width={180}
                        height={180}
                        className="w-full aspect-square object-cover rounded-full mb-4"
                      />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          handleArtistPlay(followArtist, "followingArtist", e);
                        }}
                        className="absolute bottom-2 right-1 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isArtistPlaying(followArtist.id, "followingArtist") ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                    <h3
                      className={`font-medium truncate ${
                        artistTracksMap[followArtist.id]?.some(
                          (track) => track.id === currentTrack?.id
                        ) && queueType === "followingArtist"
                          ? "text-[#A57865]"
                          : "text-white"
                      }`}
                    >
                      {followArtist.artistName}
                    </h3>
                    <p className="text-white/60 text-sm truncate">
                      {new Intl.NumberFormat("en-US").format(
                        followArtist.monthlyListeners
                      )}{" "}
                      monthly listeners
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isOwner && (
            <EditProfileModal
              open={isEditProfileModalOpen}
              onOpenChange={setIsEditProfileModalOpen}
              onSuccess={() => {
                toast.success("Profile updated successfully!");
              }}
              simpleMode={true}
            />
          )}

          {/* Render the Already Exists Dialog */}
          <AlreadyExistsDialog
            open={isAlreadyExistsDialogOpen}
            onOpenChange={setIsAlreadyExistsDialogOpen}
            playlistName={duplicateInfo?.playlistName || "this playlist"}
            trackTitle={duplicateInfo?.trackTitle}
          />
        </div>
      )}
    </div>
  );
}
