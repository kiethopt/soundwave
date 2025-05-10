import Link from "next/link";
import Image from "next/image";
import {
  AddSimple,
  Music,
  Album,
  XIcon,
  Requests,
  LibraryOutline,
  LibraryFilled,
  HomeOutline,
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
import { Playlist } from "@/types";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flag, Bot } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Settings,
  ChevronLeft as Left,
  ChevronRight as Right,
} from "lucide-react";
import { Genres } from "@/components/ui/Icons";

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
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { socket } = useSocket();
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [showAiPromptInput, setShowAiPromptInput] = useState(false);
  const [aiPromptValue, setAiPromptValue] = useState("");
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));

      window.dispatchEvent(new CustomEvent("storage-changed"));
    } catch (error) {
      console.error(
        "Error writing sidebarCollapsed state to localStorage:",
        error
      );
    }
  }, [isCollapsed]);

  // Listen for changes in the sidebar collapsed setting
  useEffect(() => {
    const handleSidebarCollapsedChange = (event: CustomEvent) => {
      const { collapsed } = event.detail;
      setIsCollapsed(collapsed);
    };

    window.addEventListener(
      "sidebar-collapsed-changed",
      handleSidebarCollapsedChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "sidebar-collapsed-changed",
        handleSidebarCollapsedChange as EventListener
      );
    };
  }, []);

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
    setFavoritePlaylist(null);
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

        setFavoritePlaylist(fav);

        const normalAndUserAIPlaylists = fetchedPlaylists.filter(
          (p: Playlist) =>
            p.type !== "FAVORITE" &&
            !(p.name === "Welcome Mix" && p.type === "SYSTEM") &&
            p.name !== "Welcome Mix" &&
            ((p.isAIGenerated && p.type !== "SYSTEM") ||
              (!p.isAIGenerated && p.type !== "SYSTEM"))
        );
        setPlaylists(normalAndUserAIPlaylists);
      } else {
        console.error("Error fetching playlists:", response.message);
        toast.error(response.message || "Could not load playlists");
      }
    } catch (err: unknown) {
      console.error("Error fetching playlists:", err);
      toast.error("Could not load playlists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists();
    }

    const handleFavoritesChanged = () => {
      console.log("Favorites changed event received, refreshing playlists");
      fetchPlaylists();
    };

    // Listen for playlist-updated event (for add/remove track, playlist changes)
    const handlePlaylistUpdated = () => {
      console.log("playlist-updated event received, refreshing playlists");
      fetchPlaylists();
    };
    window.addEventListener("playlist-updated", handlePlaylistUpdated);
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
      window.removeEventListener("favorites-changed", handleFavoritesChanged);
      window.removeEventListener("playlist-updated", handlePlaylistUpdated);

      // Clean up socket listeners
      if (socket) {
        console.log("[Socket] Cleaning up listeners");
        socket.off("playlist-updated");
        socket.off("favorites-updated");
      }
    };
  }, [isAuthenticated, socket, userId, pathname]);

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
      (p) => p.type !== "SYSTEM" && p.type !== "FAVORITE" && !p.isAIGenerated
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
    } catch (error: unknown) {
      console.error("Error creating playlist:", error);
      if (error instanceof Error) {
        toast.error(
          error.message || "An error occurred while creating the playlist."
        );
      } else {
        toast.error("An unknown error occurred while creating the playlist.");
      }
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const handlePlaylistCreated = () => {
    fetchPlaylists();
  };

  const toggleAiPromptInput = () => {
    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    if (isCollapsed) {
      setIsCollapsed(false); // Expand sidebar if collapsed
    }
    setShowAiPromptInput(!showAiPromptInput);
    setAiPromptValue(""); // Reset prompt value when toggling
  };

  const handleGenerateAIPlaylistInline = async () => {
    if (!aiPromptValue.trim()) {
      toast.error("Please enter a prompt to generate the playlist.");
      return;
    }

    setIsGeneratingWithAI(true);
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Authentication required.");
      setIsGeneratingWithAI(false);
      setShowAiPromptInput(false);
      return;
    }

    try {
      const response = await api.generate.createPlaylistFromPrompt({ prompt: aiPromptValue }, token);
      
      if (response && response.playlist) { 
        toast.success(response.message || 'AI Playlist generated successfully!');
        fetchPlaylists(); 
        setShowAiPromptInput(false);
        setAiPromptValue("");
        router.push(`/playlists/${response.playlist.id}`);
      } else {
        const errorMessage = response?.message || 'Failed to generate AI playlist. The AI might not have found suitable tracks.';
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error generating AI playlist inline:', error);
      toast.error(error.message || 'An error occurred while generating the playlist.');
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  const isActive = (path: string) => pathname === path;
  const isActiveIncludingSubpaths = (basePath: string) =>
    pathname.startsWith(basePath);

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
                    isCollapsed ? "flex justify-center" : "flex justify-start"
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
              className={`flex-1 min-h-0 ${
                userRole === ("ADMIN" as "USER" | "ADMIN") ? "px-2" : "px-4"
              }`}
            >
              {userRole === ("USER" as "USER" | "ADMIN") &&
                currentProfile === ("USER" as "USER" | "ARTIST") && (
                  <div className="flex flex-col h-full">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
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
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                className={`min-w-[180px] ${
                                  theme === "light"
                                    ? "bg-white border-gray-200"
                                    : "bg-[#282828] border-neutral-700 text-white"
                                }`}
                                sideOffset={5}
                                align="end"
                              >
                                <DropdownMenuItem
                                  onClick={handleCreateInstantPlaylist}
                                  disabled={isCreatingPlaylist}
                                  className={`cursor-pointer ${
                                    theme === "light"
                                      ? "hover:bg-gray-100"
                                      : "hover:bg-white/10"
                                  }`}
                                >
                                  Create Playlist
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={toggleAiPromptInput}
                                  className={`cursor-pointer ${
                                    theme === "light"
                                      ? "hover:bg-gray-100"
                                      : "hover:bg-white/10"
                                  }`}
                                >
                                  Create Playlist with AI
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className={`playlist-scroll-container flex-1 mt-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent pb-6 ${
                        isCollapsed
                          ? "space-y-2 flex flex-col items-center pt-2 px-6 pr-8"
                          : "space-y-1 pr-1"
                      }`}
                    >
                      {isCollapsed && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button disabled={isCreatingPlaylist}>
                              <div
                                className={`flex items-center justify-center w-10 h-10 p-1.5 rounded-lg bg-neutral-800 text-white/70 hover:text-white hover:bg-[#333333] transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <AddSimple className="w-6 h-6" />
                              </div>
                            </button>
                          </DropdownMenuTrigger>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div></div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-[#282828] border-none text-white"
                            >
                              <p>Add to library</p>
                            </TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent
                            className={`min-w-[180px] ${
                              theme === "light"
                                ? "bg-white border-gray-200"
                                : "bg-[#282828] border-neutral-700 text-white"
                            }`}
                            sideOffset={5}
                            align="end"
                          >
                            <DropdownMenuItem
                              onClick={handleCreateInstantPlaylist}
                              disabled={isCreatingPlaylist}
                              className={`cursor-pointer ${
                                theme === "light"
                                  ? "hover:bg-gray-100"
                                  : "hover:bg-white/10"
                              }`}
                            >
                              Create Playlist
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={toggleAiPromptInput}
                              className={`cursor-pointer ${
                                theme === "light"
                                  ? "hover:bg-gray-100"
                                  : "hover:bg-white/10"
                              }`}
                            >
                              Create Playlist with AI
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Inline AI Playlist Input */}
                      {showAiPromptInput && !isCollapsed && (
                        <div className={`p-3 rounded-lg my-2 ${theme === 'light' ? 'bg-gray-100' : 'bg-neutral-800'}`}>
                          <textarea
                            placeholder='e.g., "Chill V-Pop for a rainy day"'
                            value={aiPromptValue}
                            onChange={(e) => setAiPromptValue(e.target.value)}
                            disabled={isGeneratingWithAI}
                            rows={3}
                            className={`w-full p-2 border rounded-md text-sm resize-none mb-2 ${
                              theme === 'dark'
                                ? 'bg-neutral-700 border-neutral-600 placeholder-neutral-400 text-white focus:ring-primary focus:border-primary'
                                : 'bg-gray-50 border-gray-300 placeholder-gray-500 text-black focus:ring-primary-dark focus:border-primary-dark'
                            }`}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setShowAiPromptInput(false)}
                              disabled={isGeneratingWithAI}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                                theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700' : 'text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Cancel
                            </button>
                            
                            {/* Conditional Button Rendering */}
                            {isGeneratingWithAI ? (
                              <button
                                disabled={true}
                                className={`relative inline-flex h-auto items-center justify-center overflow-hidden rounded-md p-[1px] text-xs font-semibold focus:outline-none ${
                                  theme === 'dark' ? 'focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-neutral-900' : 'focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-white'
                                }`}
                              >
                                <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] ${ 
                                    theme === 'dark' 
                                      ? 'bg-[conic-gradient(from_90deg_at_50%_50%,#a855f7_0%,#ec4899_50%,#a855f7_100%)]' 
                                      : 'bg-[conic-gradient(from_90deg_at_50%_50%,#c084fc_0%,#f472b6_50%,#c084fc_100%)]'
                                }`} />
                                <span className={`relative z-10 inline-flex h-full w-full cursor-not-allowed items-center justify-center rounded-[calc(0.375rem-1px)] px-[calc(0.75rem-1px)] py-[calc(0.375rem-1px)] transition-colors ${
                                  theme === 'dark' ? 'bg-neutral-800 text-neutral-100' : 'bg-gray-200 text-gray-700'
                                }`}>
                                  <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="font-semibold">Generating...</span>
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={handleGenerateAIPlaylistInline}
                                disabled={!aiPromptValue.trim()}
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ 
                                  !aiPromptValue.trim()
                                    ? (theme === 'dark' ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                    : (theme === 'dark' ? 'bg-yellow-500 text-black hover:bg-yellow-400 focus-visible:ring-yellow-400 focus-visible:ring-offset-neutral-900' : 'bg-primary-dark hover:bg-primary-dark/80 text-white focus-visible:ring-primary-dark focus-visible:ring-offset-white')
                                }`}
                              >
                                <Bot className="w-4 h-4 mr-1.5" />
                                <span>Generate</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {/* End Inline AI Playlist Input */}

                      {favoritePlaylist && favoritePlaylist.totalTracks > 0 && (
                        <div>
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
                      {!isCollapsed &&
                        (!isAuthenticated ||
                          (isAuthenticated &&
                            !loading &&
                            playlists.length === 0)) && (
                          <div
                            className={`p-4 rounded-lg mt-4 ${
                              theme === "light" ? "bg-gray-100" : "bg-[#242424]"
                            }`}
                          >
                            <h3
                              className={`font-bold text-base ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
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
                              It&apos;s easy! We&apos;ll help you
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
                        )}

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
                                ? "items-center justify-center py-1 group"
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
                                    className={`relative p-1.5 rounded-lg ${
                                      isActive(`/playlists/${playlist.id}`)
                                        ? "bg-[#A57865]/30"
                                        : "bg-neutral-800"
                                    } flex items-center justify-center w-10 h-10 shadow-md transition-all duration-200 group-hover:scale-105 group-hover:bg-[#333333]`}
                                  >
                                    <PlaylistIcon
                                      coverUrl={playlist.coverUrl}
                                      name={playlist.name}
                                      type={playlist.type}
                                      isAIGenerated={playlist.isAIGenerated}
                                      size={28}
                                      className="rounded object-cover"
                                    />
                                    {playlist.isAIGenerated && (
                                      <div className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                                        <Image
                                          src="/images/googleGemini_icon.png"
                                          width={12}
                                          height={12}
                                          alt="AI"
                                          className="rounded-full"
                                        />
                                      </div>
                                    )}
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
                                    Playlist • {playlist.totalTracks || 0}{" "}
                                    tracks
                                    {playlist.isAIGenerated && " (AI)"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="flex items-center w-full gap-2">
                                <div className="w-10 h-10 min-w-[40px] rounded overflow-hidden mr-1 relative">
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
                                  {playlist.isAIGenerated && (
                                    <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                                      <Image
                                        src="/images/googleGemini_icon.png"
                                        width={14}
                                        height={14}
                                        alt="AI"
                                        className="rounded-full"
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

                    {/* Old Album Management */}
                    {/* <Link
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
                    </Link> */}

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
                          <span>Track</span>
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
                    className={`flex items-center px-3 py-2.5 rounded-md ${
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
                    href="/admin/bulk-upload"
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/bulk-upload")
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
                        <span className="ml-3 font-medium text-sm">Upload</span>
                      </>
                    )}
                  </Link>

                  <Link
                    href="/admin/artist-requests"
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/artist-requests")
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
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/users") &&
                      !isActiveIncludingSubpaths("/admin/ai-management/users")
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    title="Manage all users"
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
                    href="/admin/ai-management/users"
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/ai-management/users")
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    title="Manage AI-generated playlists for users"
                  >
                    {isCollapsed ? (
                      <div className="w-full flex justify-center">
                        <Bot className="w-6 h-6" />
                      </div>
                    ) : (
                      <>
                        <div className="min-w-[32px] flex justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                        <span className="ml-3 font-medium text-sm">
                          System Playlists
                        </span>
                      </>
                    )}
                  </Link>

                  <Link
                    href="/admin/artists"
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/artists")
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
                    href="/admin/reports"
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/reports")
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {isCollapsed ? (
                      <div className="w-full flex justify-center">
                        <Flag className="w-6 h-6" />
                      </div>
                    ) : (
                      <>
                        <div className="min-w-[32px] flex justify-center">
                          <Flag className="w-5 h-5" />
                        </div>
                        <span className="ml-3 font-medium text-sm">
                          Reports
                        </span>
                      </>
                    )}
                  </Link>

                  <Link
                    href="/admin/genres"
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/genres")
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
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/labels")
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
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/content")
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
                    className={`flex items-center px-3 py-2.5 rounded-md ${
                      isActiveIncludingSubpaths("/admin/system")
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
              className={`flex-shrink-0 p-4 flex ${
                isCollapsed ? "justify-center" : "justify-start"
              } ${userRole === ("ADMIN" as "USER" | "ADMIN") ? "mt-auto" : ""}`}
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
