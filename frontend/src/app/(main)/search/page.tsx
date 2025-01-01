'use client';

import { useEffect, useState } from 'react';
// import { SearchIcon } from '@/components/ui/Icons';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  imageUrl: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (query) {
      // Thực hiện tìm kiếm khi query thay đổi
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    // Giả lập API call
    const mockResults: SearchResult[] = [
      {
        id: '1',
        title: 'Song 1',
        artist: 'Artist 1',
        album: 'Album 1',
        imageUrl: '/placeholder.svg?height=200&width=200',
      },
      {
        id: '2',
        title: 'Song 2',
        artist: 'Artist 2',
        album: 'Album 2',
        imageUrl: '/placeholder.svg?height=200&width=200',
      },
      {
        id: '3',
        title: 'Song 3',
        artist: 'Artist 3',
        album: 'Album 3',
        imageUrl: '/placeholder.svg?height=200&width=200',
      },
      {
        id: '4',
        title: 'Song 4',
        artist: 'Artist 4',
        album: 'Album 4',
        imageUrl: '/placeholder.svg?height=200&width=200',
      },
    ];

    setSearchResults(mockResults);
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
                src={result.imageUrl}
                alt={result.title}
                className="w-full aspect-square object-cover rounded-md mb-4"
              />
              <h3 className="text-white font-medium">{result.title}</h3>
              <p className="text-white/60 text-sm">
                {result.artist} • {result.album}
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
