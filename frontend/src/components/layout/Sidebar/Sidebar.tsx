import Link from 'next/link';
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
} from '@/components/ui/Icons';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { CreatePlaylistDialog } from '@/components/playlist/CreatePlaylistDialog';
import { api } from '@/utils/api';

interface Playlist {
  id: string;
  name: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  type: 'FAVORITE' | 'NORMAL';
}

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<'USER' | 'ADMIN'>('USER');
  const [hasArtistProfile, setHasArtistProfile] = useState(false);
  const [isArtistVerified, setIsArtistVerified] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<'USER' | 'ARTIST'>(
    'USER'
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { theme } = useTheme();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsedState) {
      setIsCollapsed(JSON.parse(savedCollapsedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const userData = localStorage.getItem('userData');
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
      const token = localStorage.getItem('userToken');
      if (!token) {
        return;
      }

      const response = await api.playlists.getAll(token);
      setPlaylists(response.data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists();
    }
  }, [isAuthenticated]);

  const isActive = (path: string) => pathname === path;

  // Tách playlist yêu thích và playlist thường
  const favoritePlaylist = playlists.find((p) => p.type === 'FAVORITE');
  const normalPlaylists = playlists.filter((p) => p.type === 'NORMAL');

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
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex-shrink-0
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${
            theme === 'light'
              ? 'bg-white border-r border-gray-200'
              : 'bg-[#121212] border-r border-white/10'
          }
        `}
      >
        <div className="h-full flex flex-col">
          <div
            className={`md:hidden p-4 ${
              isCollapsed ? 'flex justify-center' : 'flex justify-end'
            }`}
          >
            <button
              onClick={onClose}
              className={`p-1 flex items-center justify-center w-8 h-8 rounded-full ${
                theme === 'light'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4">
            {/* Library Section - Only for regular users */}
            {currentProfile === 'USER' && userRole === 'USER' && (
              <div className="flex flex-col">
                <div className="h-[72px] -mx-4 border-b border-white/10">
                  <div className="h-full flex items-center gap-4 px-7">
                    {isCollapsed ? (
                      <div className="group">
                        <LibraryOutline
                          className={`w-7 h-7 ${
                            theme === 'light'
                              ? 'text-gray-600 group-hover:hidden'
                              : 'text-white/70 group-hover:hidden'
                          }`}
                        />
                        <LibraryFilled
                          className={`w-7 h-7 hidden group-hover:block ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}
                        />
                      </div>
                    ) : (
                      <>
                        <div
                          className={`flex items-center gap-3 group ${
                            theme === 'light'
                              ? 'text-gray-600 hover:text-gray-900'
                              : 'text-white/70 hover:text-white'
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
                          className="w-6 h-6 ml-auto hover:text-white cursor-pointer"
                          onClick={() => setIsCreateDialogOpen(true)}
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
                      className={`flex items-center px-3 py-2 rounded-md truncate ${
                        pathname === `/playlists/${favoritePlaylist.id}`
                          ? theme === 'light'
                            ? 'bg-gray-200 text-gray-900'
                            : 'bg-white/10 text-white'
                          : theme === 'light'
                          ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {isCollapsed ? (
                        <Music className="w-5 h-5" />
                      ) : (
                        <>
                          <Music className="w-5 h-5 mr-3 text-primary" />
                          <span className="truncate">
                            {favoritePlaylist.name}
                          </span>
                        </>
                      )}
                    </Link>
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
                      className={`flex items-center px-3 py-2 rounded-md truncate ${
                        pathname === `/playlists/${playlist.id}`
                          ? theme === 'light'
                            ? 'bg-gray-200 text-gray-900'
                            : 'bg-white/10 text-white'
                          : theme === 'light'
                          ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {isCollapsed ? (
                        <Music className="w-5 h-5" />
                      ) : (
                        <>
                          <Music className="w-5 h-5 mr-3" />
                          <span className="truncate">{playlist.name}</span>
                          {playlist.privacy === 'PRIVATE' && (
                            <span className="ml-2 text-xs opacity-60">
                              • Private
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Artist Section */}
            {hasArtistProfile &&
              isArtistVerified &&
              currentProfile === 'ARTIST' && (
                <div className="mt-4 space-y-2">
                  {!isCollapsed && (
                    <div
                      className={`px-3 text-sm font-medium ${
                        theme === 'light' ? 'text-gray-600' : 'text-white/70'
                      }`}
                    >
                      Artist Dashboard
                    </div>
                  )}
                  <Link
                    href="/artist/dashboard"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                      pathname.startsWith('/artist/dashboard')
                        ? theme === 'light'
                          ? 'bg-gray-200 text-gray-900'
                          : 'bg-white/10 text-white'
                        : theme === 'light'
                        ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
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
                      pathname.startsWith('/artist/albums')
                        ? theme === 'light'
                          ? 'bg-gray-200 text-gray-900'
                          : 'bg-white/10 text-white'
                        : theme === 'light'
                        ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
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
                      pathname.startsWith('/artist/tracks')
                        ? theme === 'light'
                          ? 'bg-gray-200 text-gray-900'
                          : 'bg-white/10 text-white'
                        : theme === 'light'
                        ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
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

            {/* Admin Section */}
            {userRole === 'ADMIN' && (
              <div className="mt-4 space-y-2">
                {!isCollapsed && (
                  <div
                    className={`px-3 text-sm font-medium ${
                      theme === 'light' ? 'text-gray-600' : 'text-white/70'
                    }`}
                  >
                    Admin Dashboard
                  </div>
                )}
                <Link
                  href="/admin/dashboard"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    isActive('/admin/dashboard')
                      ? theme === 'light'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-white/10 text-white'
                      : theme === 'light'
                      ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
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
                  href="/admin/artist-requests"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    pathname.startsWith('/admin/artist-requests')
                      ? theme === 'light'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-white/10 text-white'
                      : theme === 'light'
                      ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isCollapsed ? (
                    <Requests className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <Requests className="w-6 h-6" />
                      <span>Artist Requests</span>
                    </>
                  )}
                </Link>
                <Link
                  href="/admin/users"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    pathname.startsWith('/admin/users')
                      ? theme === 'light'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-white/10 text-white'
                      : theme === 'light'
                      ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isCollapsed ? (
                    <Users className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <Users className="w-6 h-6" />
                      <span>Users</span>
                    </>
                  )}
                </Link>
                <Link
                  href="/admin/artists"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    pathname.startsWith('/admin/artists')
                      ? theme === 'light'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-white/10 text-white'
                      : theme === 'light'
                      ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isCollapsed ? (
                    <Users className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <Users className="w-6 h-6" />
                      <span>Artists</span>
                    </>
                  )}
                </Link>
                <Link
                  href="/admin/genres"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    pathname.startsWith('/admin/genres')
                      ? theme === 'light'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-white/10 text-white'
                      : theme === 'light'
                      ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isCollapsed ? (
                    <Genres className="w-6 h-6 mx-auto" />
                  ) : (
                    <>
                      <Genres className="w-6 h-6" />
                      <span>Genres</span>
                    </>
                  )}
                </Link>
              </div>
            )}
          </nav>

          <div className="p-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                theme === 'light'
                  ? 'bg-gray-200 hover:bg-gray-200 text-gray-600'
                  : 'bg-white/10 hover:bg-white/20 text-white'
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
    </>
  );
}
