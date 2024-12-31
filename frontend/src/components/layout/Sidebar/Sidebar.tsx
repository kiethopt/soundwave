import Link from 'next/link';
import {
  HomeIcon,
  SearchIcon,
  LibraryIcon,
  PlusIcon,
} from '@/components/ui/Icons';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#111111] h-screen flex flex-col">
      <div className="p-6">
        <nav className="space-y-6">
          <div className="space-y-6">
            <Link
              href="/"
              className="flex items-center gap-4 text-sm font-medium text-white hover:text-white/70"
            >
              <HomeIcon className="w-6 h-6" />
              Your Library
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-4 text-sm font-medium text-white/70 hover:text-white"
            >
              <SearchIcon className="w-6 h-6" />
              Search
            </Link>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white/70">
                <LibraryIcon className="w-6 h-6" />
                <span className="text-sm font-medium">Your Library</span>
              </div>
              <button className="p-1 hover:bg-white/10 rounded-full">
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <Link
                href="/playlists"
                className="block p-2 rounded-md hover:bg-white/10"
              >
                <p className="text-sm font-medium">Playlists</p>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
