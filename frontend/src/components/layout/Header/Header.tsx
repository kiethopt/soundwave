'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Home, Menu, Search, Settings } from '@/components/ui/Icons';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
}

export default function Header({
  isSidebarOpen,
  onMenuClick,
}: {
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isActive = (path: string) => pathname === path;

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');

      if (token && storedUserData) {
        setIsAuthenticated(true);
        setUserData(JSON.parse(storedUserData));
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
    };

    checkAuth();
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    router.push('/login');
  };

  return (
    <header className="h-16 bg-[#111111] flex items-center justify-between px-2 md:px-4 lg:px-6">
      {/* Left side - Navigation */}
      <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-white/70 hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Navigation Links - Hidden on Mobile, Visible on Tablet and Desktop */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link
            href="/"
            className={`flex items-center gap-2 text-sm font-medium ${
              isActive('/') ? 'text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="hidden lg:inline">Home</span>
          </Link>

          <Link
            href="/discover"
            className={`flex items-center gap-2 text-sm font-medium ${
              isActive('/discover')
                ? 'text-white'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>Discover</span>
          </Link>
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-[400px] px-2 md:px-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-white/10 text-white rounded-full py-1.5 md:py-2 pl-10 pr-4 text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/20"
          />
        </form>
      </div>

      {/* Right side - User controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {isAuthenticated ? (
          <>
            {/* Hide Bell and Settings on mobile and small tablets */}
            <button className="hidden lg:block p-2 hover:bg-white/10 rounded-full">
              <Bell className="w-5 h-5 text-white" />
            </button>
            <button className="hidden lg:block p-2 hover:bg-white/10 rounded-full">
              <Settings className="w-5 h-5 text-white" />
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden bg-white/10 hover:bg-white/20"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <Image
                  src={userData?.avatar || '/images/default-avatar.jpg'}
                  alt="User avatar"
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                  priority
                />
              </button>

              {/* Dropdown Menu - Adjusted for mobile */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-[#282828] rounded-md shadow-lg py-1 z-50">
                  {/* Show Bell and Settings in dropdown on mobile and small tablets */}
                  <div className="lg:hidden">
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-white/10"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Bell className="w-4 h-4 mr-3" />
                      Notifications
                    </button>
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-white/10"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </button>
                    <div className="border-t border-white/10 my-1"></div>
                  </div>
                  <Link
                    href="/account"
                    className="block px-4 py-2 text-sm text-white hover:bg-white/10"
                    onClick={() => setShowDropdown(false)}
                  >
                    Account
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-white hover:bg-white/10"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile
                  </Link>
                  {/* Thêm option "Become an Artist" */}
                  <Link
                    href="/request-artist"
                    className="block px-4 py-2 text-sm text-white hover:bg-white/10"
                    onClick={() => setShowDropdown(false)}
                  >
                    Become an Artist
                  </Link>
                  <div className="border-t border-white/10 my-1"></div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/register')}
              className="text-white/70 hover:text-white text-sm font-medium hidden md:block"
            >
              Sign up
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-white text-black px-3 md:px-6 py-1.5 md:py-2 rounded-full text-sm font-medium hover:bg-white/90"
            >
              Log in
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
