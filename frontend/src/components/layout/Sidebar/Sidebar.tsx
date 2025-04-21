import Link from "next/link";
import Image from "next/image";
import {
  AddSimple,
  Music,
  Album,
  Users,
  XIcon,
  Requests,
  Left,
  Right,
  Genres,
  LibraryOutline,
  LibraryFilled,
  HomeOutline,
  Settings,
  ChartIcon,
  Tags,
  LayoutGrid,
} from "@/components/ui/Icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { PlaylistIcon } from "@/components/user/playlist/PlaylistIcon";
import { BsFillPinAngleFill } from "react-icons/bs";
import { BsStars } from "react-icons/bs";
import { Playlist } from "@/types";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const getInitialCollapsedState = (): boolean => {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    const savedState = localStorage.getItem("sidebarCollapsed");
    return savedState !== null ? JSON.parse(savedState) : false;
  } catch (error) {
    console.error(
      "Error reading sidebarCollapsed state from localStorage:",
      error
    );
    return false;
  }
};

export default function Sidebar({
  isOpen,
  onClose,
  isPlayerBarVisible,
}: {
  isOpen: boolean;
  onClose: () => void;
  isPlayerBarVisible: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"USER" | "ADMIN">("USER");
  const [hasArtistProfile, setHasArtistProfile] = useState(false);
  const [isArtistVerified, setIsArtistVerified] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<"USER" | "ARTIST">(
    "USER"
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    getInitialCollapsedState
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { theme } = useTheme();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allUserPlaylists, setAllUserPlaylists] = useState<Playlist[]>([]);
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();
  const [favoritePlaylist, setFavoritePlaylist] = useState<Playlist | null>(
    null
  );
  const [vibeRewindPlaylist, setVibeRewindPlaylist] = useState<Playlist | null>(
    null
  );
  const [welcomeMixPlaylist, setWelcomeMixPlaylist] = useState<Playlist | null>(
    null
  );
  const [playlistAI, setPlaylistAI] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { socket } = useSocket();
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  useEffect(() => {
    try {
       localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    } catch (error) {
      console.error(
        "Error writing sidebarCollapsed state to localStorage:",
        error
      );
    }
  }, [isCollapsed]);

  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
      setCurrentProfile(user.currentProfile);
      setHasArtistProfile(!!user.artistProfile);
      setIsArtistVerified(user.artistProfile?.isVerified || false);
      setIsAuthenticated(true);
      setUserId(user.id);
    } else {
      setIsAuthenticated(false);
      setUserId(null);
    }
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    setError(null);
    setFavoritePlaylist(null);
    setVibeRewindPlaylist(null);
    setWelcomeMixPlaylist(null);
    setPlaylistAI(null);
    setPlaylists([]);
    setAllUserPlaylists([]);

    const token = localStorage.getItem("userToken");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.playlists.getAll(token);

      if (response.success) {
        const fetchedPlaylists: Playlist[] = response.data || [];
        setAllUserPlaylists(fetchedPlaylists);

        const fav =
          fetchedPlaylists.find((p: Playlist) => p.type === "FAVORITE") || null;
        const vibe =
          fetchedPlaylists.find(
            (p: Playlist) =>
              p.name === "Vibe Rewind" ||
              (p.type === "SYSTEM" && p.name === "Vibe Rewind")
          ) || null;
        const welcome =
          fetchedPlaylists.find(
            (p: Playlist) =>
              p.name === "Welcome Mix" ||
              (p.type === "SYSTEM" && p.name === "Welcome Mix")
          ) || null;
        const ai =
          fetchedPlaylists.find(
            (p: Playlist) =>
              p.name === "AI Playlist" ||
              p.name.includes("AI Playlist") ||
              (p.type === "SYSTEM" && p.isAIGenerated)
          ) || null;

        setFavoritePlaylist(fav);
        setVibeRewindPlaylist(vibe);
        setWelcomeMixPlaylist(welcome);
        setPlaylistAI(ai);

        const normal = fetchedPlaylists.filter(
          (p: Playlist) =>
            p.type !== "FAVORITE" &&
            p.name !== "Vibe Rewind" &&
            p.name !== "Welcome Mix" &&
            p.name !== "AI Playlist" &&
            !p.name.includes("AI Playlist") &&
            (p.type !== "SYSTEM" || !p.isAIGenerated) &&
            p.type !== "SYSTEM" &&
            !p.isAIGenerated
        );
        setPlaylists(normal);
      } else {
        setError(response.message || "Could not load playlists");
      }
    } catch (err: any) {
      console.error("Error fetching playlists:", err);
      setError("Could not load playlists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists();
    }

    const handlePlaylistUpdate = () => {
      console.log("Playlist updated event received, refreshing playlists");
      fetchPlaylists();
    };

    const handleFavoritesChanged = () => {
      console.log("Favorites changed event received, refreshing playlists");
      fetchPlaylists();
    };

    window.addEventListener("playlist-updated", handlePlaylistUpdate);
    window.addEventListener("favorites-changed", handleFavoritesChanged);

    // Socket event listeners for real-time updates
    if (socket && userId) {
      console.log(`[Socket] Setting up listeners for user ${userId}`);
      
      // Listen for global playlist updates
      socket.on("playlist-updated", () => {
        console.log("[Socket] Global playlist update received");
        fetchPlaylists();
      });

      // Listen for user-specific favorites updates
      socket.on("favorites-updated", (data) => {
        console.log(
          `[Socket] Favorites update received for user ${userId}: ${
            data.action
          } - ${data.trackId || data.playlistId}`
        );
        fetchPlaylists();
      });

      // Ensure user is in their room for targeted events
      socket.emit("join-room", `user-${userId}`);
    }

    return () => {
      window.removeEventListener("playlist-updated", handlePlaylistUpdate);
      window.removeEventListener("favorites-changed", handleFavoritesChanged);
      
      // Clean up socket listeners
      if (socket) {
        console.log("[Socket] Cleaning up listeners");
        socket.off("playlist-updated");
        socket.off("favorites-updated");
      }
    };
  }, [isAuthenticated, socket, userId]);

  const handleCreateInstantPlaylist = async () => {
    if (isCreatingPlaylist) return;

    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    setIsCreatingPlaylist(true);
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Authentication required.");
      setIsCreatingPlaylist(false);
      return;
    }

    const playlistCount = allUserPlaylists.filter(
      (p) => p.type !== "SYSTEM" && p.type !== "FAVORITE"
    ).length;
    const newPlaylistName = `My Playlist #${playlistCount + 1}`;

    try {
      const response = await api.playlists.create(
        { name: newPlaylistName, description: "", privacy: "PRIVATE" },
        token
      );

      if (response.success && response.data) {
        const newPlaylistId = response.data.id;
        toast.success(`Playlist "${newPlaylistName}" created!`);

        window.dispatchEvent(new CustomEvent("playlist-updated"));

        router.push(`/playlists/${newPlaylistId}`);
      } else {
        toast.error(response.message || "Failed to create playlist.");
      }
    } catch (error: any) {
      console.error("Error creating playlist:", error);
      toast.error("An error occurred while creating the playlist.");
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <TooltipProvider delayDuration={0}>
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          md:transform-none md:transition-none
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:flex-shrink-0
          ${isCollapsed ? "w-20" : "w-64"}
          ${
            theme === "light"
              ? "bg-white border-r border-gray-200"
              : "bg-[#1a1a1a] border-r border-white/10"
          }
        `}
      >
        <div
          className={`h-full flex flex-col ${
            isPlayerBarVisible ? "pb-[90px]" : ""
          }`}
        >
          <div
            className={`md:hidden p-4 ${
              isCollapsed ? "flex justify-center" : "flex justify-end"
            }`}
          >
            <button
              onClick={onClose}
              className={`p-1 flex items-center justify-center w-8 h-8 rounded-full ${
                theme === "light"
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-white/10 text-white/60 hover:text-white"
              }`}
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {userRole === ("ADMIN" as "USER" | "ADMIN") && (
            <div className="px-4 py-6">
              <div
                className={
                  isCollapsed
                    ? "flex justify-center"
                    : "flex justify-start"
                }
              >
                <Image
                  src={
                    isCollapsed
                      ? "/images/Soundwave_onlySword.webp"
                      : "/images/Soundwave_full.webp"
                  }
                  alt="Soundwave Logo"
                  width={isCollapsed ? 40 : 140}
                  height={isCollapsed ? 40 : 40}
                  className="object-contain"
                />
              </div>
            </div>
          )}

          <nav
            className={`flex-1 ${
              userRole === ("ADMIN" as "USER" | "ADMIN") ? "px-2" : "px-4"
            }`}
          >
            {userRole === ("USER" as "USER" | "ADMIN") &&
              currentProfile === ("USER" as "USER" | "ARTIST") &&
              ( 
                <div className="flex flex-col">
                  <div className="h-[72px] -mx-4 border-b border-white/10">
                    <div className="h-full flex items-center gap-4 px-7">
                      {isCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full flex justify-center py-1 group">
                                <div className="relative p-1.5 rounded-lg bg-neutral-800 flex items-center justify-center w-10 h-10 shadow-md cursor-pointer">
                                  <LibraryOutline className="w-7 h-7 text-white/70 group-hover:hidden" />
                                  <LibraryFilled className="w-7 h-7 text-white hidden group-hover:block" />
                        </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-[#282828] border-none text-white"
                            >
                              <p>Your Library</p>
                            </TooltipContent>
                          </Tooltip>
                      ) : (
                        <>
                          <div
                              className={`flex items-center gap-3 group cursor-pointer ${
                              theme === "light"
                                ? "text-gray-600 hover:text-gray-900"
                                : "text-white/70 hover:text-white"
                            }`}
                          >
                            <div className="relative">
                              <LibraryOutline className="w-7 h-7 group-hover:hidden" />
                              <LibraryFilled className="w-7 h-7 hidden group-hover:block" />
                            </div>
                            <span className="text-base font-medium">
                              Your Library
                            </span>
                          </div>
                            <button
                              onClick={handleCreateInstantPlaylist}
                              disabled={isCreatingPlaylist}
                              className={`ml-auto p-1 rounded-md ${
                                theme === "light"
                                  ? "bg-gray-100 hover:bg-gray-200"
                                  : "bg-neutral-800 hover:bg-white/10"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                          <AddSimple
                                className={`w-6 h-6 ${
                              theme === "light"
                                    ? "text-gray-600 group-hover:text-gray-900"
                                    : "text-white/70 group-hover:text-white"
                                }`}
                              />
                            </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                      className={`mt-2 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-1 ${
                      isCollapsed
                          ? "space-y-2 flex flex-col items-center pt-2"
                        : "space-y-1"
                    }`}
                  >
                      {isCollapsed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleCreateInstantPlaylist}
                              disabled={isCreatingPlaylist}
                              className={`flex items-center justify-center w-10 h-10 p-1.5 rounded-lg bg-neutral-800 text-white/70 hover:text-white hover:bg-[#333333] transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <AddSimple className="w-6 h-6" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="bg-[#282828] border-none text-white"
                          >
                            <p>Create playlist</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {favoritePlaylist && favoritePlaylist.totalTracks > 0 && (
                      <div
                        className={`${
                          isCollapsed
                            ? "w-full flex items-center justify-center"
                            : ""
                        }`}
                      >
                        <Link
                          href={`/playlists/${favoritePlaylist.id}`}
                          className={`flex ${
                            isCollapsed
                              ? "items-center justify-center py-1"
                                : `items-center px-3 py-2.5 rounded-md ${
                                    isActive(
                                  `/playlists/${favoritePlaylist.id}`
                                    )
                                    ? theme === "light"
                                      ? "bg-gray-200 text-gray-900"
                                      : "bg-[#A57865]/30 text-white"
                                    : theme === "light"
                                    ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                }`
                          }`}
                        >
                          {isCollapsed ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                            <div
                              className={`p-1.5 rounded-lg ${
                                      isActive(
                                        `/playlists/${favoritePlaylist.id}`
                                      )
                                  ? "bg-[#A57865]/30"
                                  : "bg-neutral-800"
                                    } flex items-center justify-center w-10 h-10 shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#333333]`}
                            >
                              <PlaylistIcon
                                coverUrl={favoritePlaylist.coverUrl}
                                name={favoritePlaylist.name}
                                type={favoritePlaylist.type}
                                      isAIGenerated={
                                        favoritePlaylist.isAIGenerated
                                      }
                                size={28}
                                className="rounded object-cover"
                              />
                                </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="bg-[#282828] border-none text-white"
                                >
                                  <p className="font-semibold">
                                    {favoritePlaylist.name}
                                  </p>
                                  <p className="text-neutral-400 text-xs">
                                    Playlist •{" "}
                                    {favoritePlaylist.totalTracks || 0} tracks
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                          ) : (
                            <div className="flex items-center w-full gap-2">
                              <div className="w-10 h-10 min-w-[40px] rounded overflow-hidden mr-1">
                                {favoritePlaylist.coverUrl ? (
                                  <Image
                                    src={favoritePlaylist.coverUrl}
                                    alt={favoritePlaylist.name}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-neutral-800 relative">
                                    <PlaylistIcon
                                      name={favoritePlaylist.name}
                                      type={favoritePlaylist.type}
                                      isAIGenerated={
                                        favoritePlaylist.isAIGenerated
                                      }
                                      size={24}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <BsFillPinAngleFill className="w-3 h-3 text-[#A57865] flex-shrink-0" />
                                  <span className="truncate font-medium text-sm leading-tight">
                                    {favoritePlaylist.name}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs text-white/50 mt-0.5">
                                  <span className="truncate">
                                    Private •{" "}
                                    {favoritePlaylist.totalTracks || 0} tracks
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Link>
                      </div>
                    )}
                    
                    {/* Conditional rendering for 'Create playlist' prompt */}
                    {!isCollapsed && !loading && playlists.length === 0 ? (
                      <div
                        className={`p-4 rounded-lg mt-4 ${
                          theme === "light" ? "bg-gray-100" : "bg-[#242424]"
                        }`}
                      >
                        <h3
                          className={`font-bold text-base ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          Create your first playlist
                        </h3>
                        <p
                          className={`text-sm mt-1 ${
                            theme === "light"
                              ? "text-gray-600"
                              : "text-white/70"
                          }`}
                        >
                          It's easy! We'll help you
                        </p>
                        <button
                          onClick={handleCreateInstantPlaylist}
                          disabled={isCreatingPlaylist}
                          className={`mt-4 px-4 py-1.5 rounded-full font-semibold text-sm ${
                            theme === "light"
                              ? "bg-black text-white hover:bg-gray-800"
                              : "bg-white text-black hover:bg-gray-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isCreatingPlaylist
                            ? "Creating..."
                            : "Create playlist"}
                        </button>
                      </div>
                    ) : null}

                    <div
                      className={`${
                        isCollapsed
                          ? "w-full flex flex-col items-center space-y-2"
                          : ""
                      }`}
                    >
                      {playlists.map((playlist, index) => (
                        <Link
                          key={playlist.id}
                          href={`/playlists/${playlist.id}`}
                          className={`flex ${
                            isCollapsed
                              ? "items-center justify-center py-1"
                                : `items-center px-3 py-2.5 ${
                                    index > 0 ? "mt-1" : ""
                                } rounded-md ${
                                  isActive(`/playlists/${playlist.id}`)
                                    ? theme === "light"
                                      ? "bg-gray-200 text-gray-900"
                                      : "bg-[#A57865]/30 text-white"
                                    : theme === "light"
                                    ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                }`
                          }`}
                        >
                          {isCollapsed ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                            <div
                              className={`p-1.5 rounded-lg ${
                                isActive(`/playlists/${playlist.id}`)
                                  ? "bg-[#A57865]/30"
                                  : "bg-neutral-800"
                                    } flex items-center justify-center w-10 h-10 shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#333333]`}
                            >
                              <PlaylistIcon
                                coverUrl={playlist.coverUrl}
                                name={playlist.name}
                                type={playlist.type}
                                isAIGenerated={playlist.isAIGenerated}
                                size={28}
                                className="rounded object-cover"
                              />
                                </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="bg-[#282828] border-none text-white"
                                >
                                  <p className="font-semibold">
                                    {playlist.name}
                                  </p>
                                  <p className="text-neutral-400 text-xs">
                                    Playlist • {playlist.totalTracks || 0} tracks
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                          ) : (
                            <div className="flex items-center w-full gap-2">
                              <div className="w-10 h-10 min-w-[40px] rounded overflow-hidden mr-1">
                                {playlist.coverUrl ? (
                                  <Image
                                    src={playlist.coverUrl}
                                    alt={playlist.name}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                                    <PlaylistIcon
                                      name={playlist.name}
                                      type={playlist.type}
                                      isAIGenerated={playlist.isAIGenerated}
                                      size={24}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate font-medium text-sm leading-tight">
                                  {playlist.name}
                                </span>
                                <div className="flex items-center text-xs text-white/50 mt-0.5">
                                  <span className="truncate">
                                    {playlist.privacy === "PRIVATE"
                                      ? "Private"
                                      : "Public"}{" "}
                                    • {playlist.totalTracks || 0} tracks
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {/* Artist Dashboard Section */}
            {hasArtistProfile &&
              isArtistVerified &&
              currentProfile === ("ARTIST" as "USER" | "ARTIST") && (
                <div className="mt-4 space-y-2">
                  {!isCollapsed && (
                    <div
                      className={`px-3 text-sm font-medium ${
                        theme === "light" ? "text-gray-600" : "text-white/70"
                      }`}
                    >
                      Artist Dashboard
                    </div>
                  )}
                  <Link
                    href="/artist/dashboard"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                      pathname && pathname.startsWith("/artist/dashboard")
                        ? theme === "light"
                          ? "bg-gray-200 text-gray-900"
                          : "bg-[#A57865]/30 text-white"
                        : theme === "light"
                        ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isCollapsed ? (
                        <HomeOutline className="w-6 h-6" />
                    ) : (
                      <>
                        <HomeOutline className="w-6 h-6" />
                        <span>Dashboard</span>
                      </>
                    )}
                  </Link>
                  <Link
                    href="/artist/albums"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                      pathname && pathname.startsWith("/artist/albums")
                        ? theme === "light"
                          ? "bg-gray-200 text-gray-900"
                          : "bg-white/10 text-white"
                        : theme === "light"
                        ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isCollapsed ? (
                        <Album className="w-6 h-6" />
                    ) : (
                      <>
                        <Album className="w-6 h-6" />
                        <span>Albums</span>
                      </>
                    )}
                  </Link>
                  <Link
                    href="/artist/tracks"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                      pathname && pathname.startsWith("/artist/tracks")
                        ? theme === "light"
                          ? "bg-gray-200 text-gray-900"
                          : "bg-white/10 text-white"
                        : theme === "light"
                        ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isCollapsed ? (
                        <Music className="w-6 h-6" />
                    ) : (
                      <>
                        <Music className="w-6 h-6" />
                        <span>Tracks</span>
                      </>
                    )}
                  </Link>
                  <Link
                    href="/artist/stats"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                      pathname && pathname.startsWith("/artist/stats")
                        ? theme === "light"
                          ? "bg-gray-200 text-gray-900"
                          : "bg-white/10 text-white"
                        : theme === "light"
                        ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isCollapsed ? (
                        <ChartIcon className="w-6 h-6" />
                    ) : (
                      <>
                        <ChartIcon className="w-6 h-6" />
                        <span>Stats</span>
                      </>
                    )}
                  </Link>
                </div>
              )}

            {userRole === ("ADMIN" as "USER" | "ADMIN") && (
              <div className="mt-2 flex flex-col gap-1">
                {!isCollapsed && (
                  <div className="px-3 py-2 text-xs font-medium uppercase text-gray-500">
                    Menu
                  </div>
                )}

                <Link
                  href="/admin/dashboard"
                  className={`flex items-center px-3 py-2.5 ${
                    isActive("/admin/dashboard")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <HomeOutline className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <HomeOutline className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">
                        Dashboard
                      </span>
                    </>
                  )}
                </Link>

                <Link
                  href="/admin/artist-requests"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/artist-requests")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <Requests className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Requests className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">
                        Artist Requests
                      </span>
                    </>
                  )}
                </Link>

                {!isCollapsed && (
                  <div className="mt-4 px-3 py-2 text-xs font-medium uppercase text-gray-500">
                    Management
                  </div>
                )}

                <Link
                  href="/admin/users"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/users")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Users</span>
                    </>
                  )}
                </Link>

                <Link
                  href="/admin/artists"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/artists")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                        <span className="ml-3 font-medium text-sm">
                          Artists
                        </span>
                    </>
                  )}
                </Link>

                <Link
                  href="/admin/genres"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/genres")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <Genres className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Genres className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Genres</span>
                    </>
                  )}
                </Link>

                <Link
                  href="/admin/labels"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/labels")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <Tags className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Tags className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Labels</span>
                    </>
                  )}
                </Link>

                <Link
                  href="/admin/content"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/content")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                        <span className="ml-3 font-medium text-sm">
                          Content
                        </span>
                    </>
                  )}
                </Link>

                {!isCollapsed && (
                  <div className="mt-4 px-3 py-2 text-xs font-medium uppercase text-gray-500">
                    Configuration
                  </div>
                )}

                <Link
                  href="/admin/system"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/system")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-full flex justify-center">
                      <Settings className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Settings className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">System</span>
                    </>
                  )}
                </Link>
              </div>
            )}
          </nav>

          <div
            className={`p-4 flex ${
              isCollapsed ? "justify-center" : "justify-start"
            } ${
              userRole === ("ADMIN" as "USER" | "ADMIN") ? "mt-auto" : ""
            }`}
          >
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                userRole === ("ADMIN" as "USER" | "ADMIN")
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  : theme === "light"
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-600"
                  : "bg-neutral-800 hover:bg-[#333333] text-white shadow-md transition-all duration-200"
              }`}
            >
              {isCollapsed ? (
                <Right className="w-5 h-5" />
              ) : (
                <Left className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
      </TooltipProvider>

      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}