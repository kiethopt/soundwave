'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Track } from '@/types';
import { api } from '@/utils/api';
import { useState, useEffect } from 'react';

// Loading UI component
function LoadingUI() {
  return (
    <div className="p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-white/5 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white/5 p-4 rounded-lg">
              <div className="bg-white/10 aspect-square rounded-md mb-4"></div>
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Search Results Component
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function performSearch() {
      if (!query) return;

      setIsLoading(true);
      try {
        const response = await fetch(api.tracks.search(query));
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [query]);

  if (isLoading) return <LoadingUI />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">
        Search Results for "{query}"
      </h1>
      {searchResults.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {searchResults.map((track) => (
            <div key={track.id} className="bg-white/5 p-4 rounded-lg">
              <img
                src={track.coverUrl || '/images/default-avatar.png'}
                alt={track.title}
                className="w-full aspect-square object-cover rounded-md mb-4"
              />
              <h3 className="text-white font-medium">{track.title}</h3>
              <p className="text-white/60 text-sm">{track.artist}</p>
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

// Main Page Component
export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <SearchContent />
    </Suspense>
  );
}
