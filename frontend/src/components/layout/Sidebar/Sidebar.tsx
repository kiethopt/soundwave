import Link from 'next/link';
import {
  Home,
  Search,
  Library,
  Plus,
  Music,
  Album,
  Users,
} from '@/components/ui/Icons';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
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
    <div className="w-64 h-full bg-[#121212] flex-shrink-0 md:block hidden">
      {' '}
      {/* Giữ lại màu bg cũ */}
      <div className="px-6 py-4">
        <nav className="space-y-6">
          {/* Main Navigation - giữ nguyên phần này */}
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

          {/* Library Section - giữ nguyên phần này */}
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

          {/* Admin Section - thêm mới phần này */}
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
                  isActive('/admin/users') ? 'bg-white/10' : 'hover:bg-white/10'
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
  );
}
