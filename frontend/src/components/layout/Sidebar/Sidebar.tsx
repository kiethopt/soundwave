import Link from 'next/link';
import {
  Library,
  AddSimple,
  Music,
  Album,
  Users,
  XIcon,
  Requests,
  Home,
  Left,
  Right,
} from '@/components/ui/Icons';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const isActive = (path: string) => pathname === path;

  const handleCreatePlaylist = () => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      router.push('/create-playlist');
    }
  };

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
          bg-[#121212] transform transition-transform duration-300 ease-in-out
          md:transform-none md:transition-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex-shrink-0
          ${isCollapsed ? 'w-20' : 'w-64'}
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
              className="text-white/60 hover:text-white p-1 flex items-center justify-center w-8 h-8 rounded-full bg-white/10"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4">
            {/* Library Section - Aligned with header */}
            <div className="h-[72px] -mx-4 border-b border-white/10">
              <div className="h-full flex items-center gap-4 px-7">
                {isCollapsed ? (
                  <Library className="w-6 h-6 text-white/70 hover:text-white transition-colors" />
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                      <Library className="w-6 h-6" />
                      <span className="text-sm font-medium">Your Library</span>
                    </div>
                    <AddSimple className="w-5 h-5 ml-auto" />
                  </>
                )}
              </div>
            </div>

            {/* Playlists */}
            {currentProfile === 'USER' && (
              <div className="mt-4">
                {isAuthenticated ? (
                  [
                    {
                      id: 1,
                      name: 'Playlist 1',
                      coverImage: '/images/default-avatar.jpg',
                    },
                  ].map((playlist) => (
                    <div key={playlist.id} className="mb-2">
                      {isCollapsed ? (
                        <img
                          src={playlist.coverImage || '/placeholder.svg'}
                          alt={playlist.name}
                          className="w-12 h-12 rounded-md mx-auto"
                        />
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-white/10">
                          <img
                            src={playlist.coverImage || '/placeholder.svg'}
                            alt={playlist.name}
                            className="w-12 h-12 rounded-md"
                          />
                          <span>{playlist.name}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <button
                    onClick={handleCreatePlaylist}
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-white/10 w-full text-left"
                  >
                    {isCollapsed ? (
                      <AddSimple className="w-6 h-6 shrink-0 mx-auto" />
                    ) : (
                      <>
                        <AddSimple className="w-6 h-6 shrink-0" />
                        <span>Create Playlist</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Artist Section */}
            {hasArtistProfile &&
              isArtistVerified &&
              currentProfile === 'ARTIST' && (
                <div className="mt-4 space-y-2">
                  {!isCollapsed && (
                    <div className="px-3 text-sm font-medium text-white/70">
                      Artist Dashboard
                    </div>
                  )}
                  <Link
                    href="/artist/albums"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      pathname.startsWith('/artist/albums')
                        ? 'bg-white/10'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    {isCollapsed ? (
                      <Album className="w-6 h-6 shrink-0 mx-auto" />
                    ) : (
                      <>
                        <Album className="w-6 h-6 shrink-0" />
                        <span>Albums</span>
                      </>
                    )}
                  </Link>
                  <Link
                    href="/artist/tracks"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      pathname.startsWith('/artist/tracks')
                        ? 'bg-white/10'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    {isCollapsed ? (
                      <Music className="w-6 h-6 shrink-0 mx-auto" />
                    ) : (
                      <>
                        <Music className="w-6 h-6 shrink-0" />
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
                  <div className="px-3 text-sm font-medium text-white/70">
                    Admin Dashboard
                  </div>
                )}
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive('/admin') ? 'bg-white/10' : 'hover:bg-white/10'
                  }`}
                >
                  {isCollapsed ? (
                    <Home className="w-6 h-6 shrink-0 mx-auto" />
                  ) : (
                    <>
                      <Home className="w-6 h-6 shrink-0" />
                      <span>Dashboard</span>
                    </>
                  )}
                </Link>
                <Link
                  href="/admin/artist-requests"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname.startsWith('/admin/artist-requests')
                      ? 'bg-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {isCollapsed ? (
                    <Requests className="w-6 h-6 shrink-0 mx-auto" />
                  ) : (
                    <>
                      <Requests className="w-6 h-6 shrink-0" />
                      <span>Artist Requests</span>
                    </>
                  )}
                </Link>
                <Link
                  href="/admin/users"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname.startsWith('/admin/users')
                      ? 'bg-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {isCollapsed ? (
                    <Users className="w-6 h-6 shrink-0 mx-auto" />
                  ) : (
                    <>
                      <Users className="w-6 h-6 shrink-0" />
                      <span>Users</span>
                    </>
                  )}
                </Link>
                <Link
                  href="/admin/artists"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname.startsWith('/admin/artists')
                      ? 'bg-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {isCollapsed ? (
                    <Users className="w-6 h-6 shrink-0 mx-auto" />
                  ) : (
                    <>
                      <Users className="w-6 h-6 shrink-0" />
                      <span>Artists</span>
                    </>
                  )}
                </Link>
                <Link
                  href="/admin/genres"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname.startsWith('/admin/genres')
                      ? 'bg-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {isCollapsed ? (
                    <Music className="w-6 h-6 shrink-0 mx-auto" />
                  ) : (
                    <>
                      <Music className="w-6 h-6 shrink-0" />
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
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
    </>
  );
}
