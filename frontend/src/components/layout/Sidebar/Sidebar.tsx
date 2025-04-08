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
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { CreatePlaylistDialog } from "@/components/user/playlist/CreatePlaylistDialog";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { PlaylistIcon } from "@/components/user/playlist/PlaylistIcon";
import { BsFillPinAngleFill } from "react-icons/bs";

interface Playlist {
  id: string;
  name: string;
  privacy: "PUBLIC" | "PRIVATE";
  type: "FAVORITE" | "NORMAL";
  isAIGenerated?: boolean;
  coverUrl?: string;
  totalTracks?: number;
}

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<"USER" | "ADMIN">("USER");
  const [hasArtistProfile, setHasArtistProfile] = useState(false);
  const [isArtistVerified, setIsArtistVerified] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<"USER" | "ARTIST">(
    "USER"
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { theme } = useTheme();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();

  useEffect(() => {
    const savedCollapsedState = localStorage.getItem("sidebarCollapsed");
    if (savedCollapsedState) {
      setIsCollapsed(JSON.parse(savedCollapsedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
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
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Fetch playlists
  const fetchPlaylists = async () => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        return;
      }

      const response = await api.playlists.getAll(token);
      console.log("Fetched playlists:", response.data);
      setPlaylists(response.data || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  };

  // Lắng nghe sự kiện cập nhật playlist từ các components khác
  useEffect(() => {
    // Gọi lần đầu khi component mount
    if (isAuthenticated) {
      fetchPlaylists();
    }

    // Lắng nghe sự kiện cập nhật playlist
    const handlePlaylistUpdate = () => {
      console.log("Playlist updated event received, refreshing playlists");
      fetchPlaylists();
    };

    // Đăng ký lắng nghe sự kiện
    window.addEventListener("playlist-updated", handlePlaylistUpdate);

    // Cleanup khi component unmount
    return () => {
      window.removeEventListener("playlist-updated", handlePlaylistUpdate);
    };
  }, [isAuthenticated]);

  const isActive = (path: string) => pathname === path;

  // Tách playlist yêu thích và playlist thường
  const favoritePlaylist = playlists.find((p) => p.type === "FAVORITE");
  const vibeRewindPlaylist = playlists.find((p) => p.name === "Vibe Rewind");
  const normalPlaylists = playlists.filter(
    (p) => p.type === "NORMAL" && p.name !== "Vibe Rewind"
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

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
        <div className="h-full flex flex-col">
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

          {/* Admin Sidebar Logo */}
          {userRole === "ADMIN" && (
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

          <nav className={`flex-1 ${userRole === "ADMIN" ? "px-2" : "px-4"}`}>
            {/* Library Section - Only for regular users */}
            {currentProfile === "USER" && userRole === "USER" && (
              <div className="flex flex-col">
                <div className="h-[72px] -mx-4 border-b border-white/10">
                  <div className="h-full flex items-center gap-4 px-7">
                    {isCollapsed ? (
                      <div className="group">
                        <LibraryOutline
                          className={`w-7 h-7 ${
                            theme === "light"
                              ? "text-gray-600 group-hover:hidden"
                              : "text-white/70 group-hover:hidden"
                          }`}
                        />
                        <LibraryFilled
                          className={`w-7 h-7 hidden group-hover:block ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        />
                      </div>
                    ) : (
                      <>
                        <div
                          className={`flex items-center gap-3 group ${
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
                        <AddSimple
                          className={`w-6 h-6 ml-auto hover:text-white cursor-pointer ${
                            theme === "light"
                              ? "text-gray-600 hover:text-gray-900"
                              : "text-white/70 hover:text-white"
                          }`}
                          onClick={() => {
                            const canProceed = handleProtectedAction();
                            if (canProceed) {
                              setIsCreateDialogOpen(true);
                            }
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Playlists List */}
                <div className="mt-2 px-2 space-y-1">
                  {/* Favorite Playlist */}
                  {favoritePlaylist && (
                    <Link
                      href={`/playlists/${favoritePlaylist.id}`}
                      className={`flex items-center px-3 py-2 rounded-md ${
                        pathname === `/playlists/${favoritePlaylist.id}`
                          ? theme === "light"
                            ? "bg-gray-200 text-gray-900"
                            : "bg-white/10 text-white"
                          : theme === "light"
                          ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {isCollapsed ? (
                        <PlaylistIcon
                          coverUrl={favoritePlaylist.coverUrl}
                          name={favoritePlaylist.name}
                          type={favoritePlaylist.type}
                          isAIGenerated={favoritePlaylist.isAIGenerated}
                          size={20}
                        />
                      ) : (
                        <div className="flex items-center w-full">
                          <div className="w-10 h-10 min-w-[40px] rounded overflow-hidden mr-3">
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
                                  isAIGenerated={favoritePlaylist.isAIGenerated}
                                  size={24}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center">
                              <BsFillPinAngleFill
                                className="mr-1.5 -mt-0.5 rotate-12"
                                size={14}
                                color="#A57865"
                              />
                              <span className="truncate font-medium text-sm leading-tight">
                                {favoritePlaylist.name}
                              </span>
                            </div>
                            <span className="text-xs text-white/50 truncate mt-0.5">
                              {favoritePlaylist.privacy === "PRIVATE"
                                ? "Private"
                                : "Public"}{" "}
                              • {favoritePlaylist.totalTracks || 0} songs
                            </span>
                          </div>
                        </div>
                      )}
                    </Link>
                  )}

                  {/* Vibe Rewind Playlist */}
                  {vibeRewindPlaylist && (
                    <div className="flex flex-col">
                      <Link
                        href={`/playlists/${vibeRewindPlaylist.id}`}
                        className={`flex items-center px-3 py-2 rounded-md group ${
                          pathname === `/playlists/${vibeRewindPlaylist.id}`
                            ? theme === "light"
                              ? "bg-gray-200 text-gray-900"
                              : "bg-white/10 text-white"
                            : theme === "light"
                            ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {isCollapsed ? (
                          <PlaylistIcon
                            coverUrl={vibeRewindPlaylist.coverUrl}
                            name={vibeRewindPlaylist.name}
                            type={vibeRewindPlaylist.type}
                            isAIGenerated={vibeRewindPlaylist.isAIGenerated}
                            size={20}
                          />
                        ) : (
                          <div className="flex items-center w-full">
                            <div className="w-10 h-10 min-w-[40px] rounded overflow-hidden mr-3">
                              {vibeRewindPlaylist.coverUrl ? (
                                <Image
                                  src={vibeRewindPlaylist.coverUrl}
                                  alt={vibeRewindPlaylist.name}
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                                  <PlaylistIcon
                                    name={vibeRewindPlaylist.name}
                                    type={vibeRewindPlaylist.type}
                                    isAIGenerated={
                                      vibeRewindPlaylist.isAIGenerated
                                    }
                                    size={24}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center">
                                <span className="truncate font-medium text-sm leading-tight">
                                  {vibeRewindPlaylist.name}
                                </span>
                              </div>
                              <div className="flex items-center mt-0.5">
                                <span className="text-xs text-white/50 truncate flex-grow">
                                  Auto-Updated •{" "}
                                  {vibeRewindPlaylist.totalTracks || 0} songs
                                </span>
                                <button
                                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-emerald-500 transition-opacity"
                                  title="Update with recent tracks"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const token =
                                      localStorage.getItem("userToken");
                                    if (token) {
                                      api.playlists
                                        .updateVibeRewindPlaylist(token)
                                        .then(() => {
                                          // Refresh playlists
                                          fetchPlaylists();
                                        })
                                        .catch((error) => {
                                          console.error(
                                            "Error updating Vibe Rewind:",
                                            error
                                          );
                                        });
                                    }
                                  }}
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Link>
                    </div>
                  )}

                  {/* Divider */}
                  {normalPlaylists.length > 0 && (
                    <div className="h-px bg-white/10 my-2" />
                  )}

                  {/* Normal Playlists */}
                  {normalPlaylists.map((playlist) => (
                    <Link
                      key={playlist.id}
                      href={`/playlists/${playlist.id}`}
                      className={`flex items-center px-3 py-2 rounded-md ${
                        pathname === `/playlists/${playlist.id}`
                          ? theme === "light"
                            ? "bg-gray-200 text-gray-900"
                            : "bg-white/10 text-white"
                          : theme === "light"
                          ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {isCollapsed ? (
                        <PlaylistIcon
                          coverUrl={playlist.coverUrl}
                          name={playlist.name}
                          type={playlist.type}
                          isAIGenerated={playlist.isAIGenerated}
                          size={20}
                        />
                      ) : (
                        <div className="flex items-center w-full">
                          <div className="w-10 h-10 min-w-[40px] rounded overflow-hidden mr-3">
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
                            <span className="text-xs text-white/50 truncate mt-0.5">
                              {playlist.privacy === "PRIVATE"
                                ? "Private"
                                : "Public"}{" "}
                              • {playlist.totalTracks || 0} songs
                            </span>
                          </div>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Artist Section */}
            {hasArtistProfile &&
              isArtistVerified &&
              currentProfile === "ARTIST" && (
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
                          : "bg-white/10 text-white"
                        : theme === "light"
                        ? "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isCollapsed ? (
                      <HomeOutline className="w-6 h-6 mx-auto" />
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
                      <Album className="w-6 h-6 mx-auto" />
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
                      <Music className="w-6 h-6 mx-auto" />
                    ) : (
                      <>
                        <Music className="w-6 h-6" />
                        <span>Tracks</span>
                      </>
                    )}
                  </Link>
                </div>
              )}

            {/* Admin Section - Redesigned */}
            {userRole === "ADMIN" && (
              <div className="mt-2 flex flex-col gap-1">
                {!isCollapsed && (
                  <div className="px-3 py-2 text-xs font-medium uppercase text-gray-500">
                    Menu
                  </div>
                )}

                {/* Dashboard Section */}
                <Link
                  href="/admin/dashboard"
                  className={`flex items-center px-3 py-2.5 ${
                    isActive("/admin/dashboard")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <HomeOutline className="w-6 h-6 mx-auto" />
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

                {/* Analytics Section */}
                <Link
                  href="/admin/analytics"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/analytics")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <ChartIcon className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <ChartIcon className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">
                        Analytics
                      </span>
                    </>
                  )}
                </Link>

                {/* Artist Requests Section */}
                <Link
                  href="/admin/artist-requests"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/artist-requests")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <Requests className="w-6 h-6 mx-auto" />
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

                {/* Users Section */}
                <Link
                  href="/admin/users"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/users")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <Users className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Users</span>
                    </>
                  )}
                </Link>

                {/* Artists Section */}
                <Link
                  href="/admin/artists"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/artists")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <Users className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Artists</span>
                    </>
                  )}
                </Link>

                {/* Genres Section */}
                <Link
                  href="/admin/genres"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/genres")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <Genres className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Genres className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Genres</span>
                    </>
                  )}
                </Link>

                {/* Labels Section */}
                <Link
                  href="/admin/labels"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/labels")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <Tags className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <Tags className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Labels</span>
                    </>
                  )}
                </Link>

                {/* Content Section - NEW */}
                <Link
                  href="/admin/content"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/content")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <LayoutGrid className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <div className="min-w-[32px] flex justify-center">
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                      <span className="ml-3 font-medium text-sm">Content</span>
                    </>
                  )}
                </Link>

                {!isCollapsed && (
                  <div className="mt-4 px-3 py-2 text-xs font-medium uppercase text-gray-500">
                    Configuration
                  </div>
                )}

                {/* System Section */}
                <Link
                  href="/admin/system"
                  className={`flex items-center px-3 py-2.5 ${
                    pathname && pathname.startsWith("/admin/system")
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {isCollapsed ? (
                    <Settings className="w-6 h-6 mx-auto" />
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

          <div className={`p-4 ${userRole === "ADMIN" ? "mt-auto" : ""}`}>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                userRole === "ADMIN"
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  : theme === "light"
                  ? "bg-gray-200 hover:bg-gray-200 text-gray-600"
                  : "bg-white/10 hover:bg-white/20 text-white"
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

      <CreatePlaylistDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          fetchPlaylists();
          setIsCreateDialogOpen(false);
        }}
      />
      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
