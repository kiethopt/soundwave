import Link from 'next/link';
import {
  Home,
  Search,
  Library,
  Plus,
  Music,
  Album,
  Users,
  XIcon,
} from '@/components/ui/Icons';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setIsAdmin(user.role === 'ADMIN');
    }
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-[#121212] transform transition-transform duration-300 ease-in-out
          md:transform-none md:transition-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex-shrink-0
        `}
      >
        <div className="px-6 py-4">
          <div className="flex justify-end md:hidden mb-4">
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-1"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Existing Sidebar Content */}
          <nav className="space-y-6">
            {/* Main Navigation */}
            <div className="space-y-2">
              <Link
                href="/"
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive('/') ? 'bg-white/10' : 'hover:bg-white/10'
                }`}
              >
                <Home className="w-6 h-6" />
                <span>Home</span>
              </Link>

              <Link
                href="/search"
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive('/search') ? 'bg-white/10' : 'hover:bg-white/10'
                }`}
              >
                <Search className="w-6 h-6" />
                <span>Search</span>
              </Link>
            </div>

            {/* Library Section */}
            <div className="space-y-2 pt-4 mt-4 border-t border-white/10">
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-3">
                  <Library className="w-6 h-6" />
                  <span>Your Library</span>
                </div>
                <Plus className="w-5 h-5" />
              </div>
              {/* Playlists content */}
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div className="space-y-2 pt-4 mt-4 border-t border-white/10">
                <div className="px-3 text-sm font-medium text-white/70">
                  Admin Dashboard
                </div>
                <Link
                  href="/admin/tracks"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive('/admin/tracks')
                      ? 'bg-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <Music className="w-6 h-6" />
                  <span>Tracks</span>
                </Link>

                <Link
                  href="/admin/albums"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname.startsWith('/admin/albums')
                      ? 'bg-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <Album className="w-6 h-6" />
                  <span>Albums</span>
                </Link>

                <Link
                  href="/admin/users"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive('/admin/users')
                      ? 'bg-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <Users className="w-6 h-6" />
                  <span>Users</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
