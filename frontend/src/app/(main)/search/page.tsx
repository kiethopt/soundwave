'use client';

import { useEffect, useState } from 'react';
// import { SearchIcon } from '@/components/ui/Icons';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Track, Album } from '@/types/index';


function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  useEffect(() => {
    if (query) {
      // Thực hiện tìm kiếm khi query thay đổi
      performSearchTrack(query);
    }
  }, [query]);

  const performSearchTrack = async (searchQuery: string) => {
    // Giả lập API call
    const response = await fetch(`http://localhost:10000/api/tracks/search?q=${searchQuery}`);
    const data = await response.json();

    setSearchResults(data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">
        Search Results for "{query}"
      </h1>
      {searchResults.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {searchResults.map((result) => (
            <div key={result.id} className="bg-white/5 p-4 rounded-lg">
              <img
                src={result.coverUrl}
                alt={result.title}
                className="w-full aspect-square object-cover rounded-md mb-4"
              />
              <h3 className="text-white font-medium">{result.title}</h3>
              <p className="text-white/60 text-sm">
                {result.artist}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/60">
          No results found for "{query}". Try searching for something else.
        </p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
