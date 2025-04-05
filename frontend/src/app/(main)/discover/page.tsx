'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Genre } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { api } from '@/utils/api';
import { getDominantHexColor } from '@/utils/tailwind-color-map';

export default function DiscoveryPage() {
  const { theme, updateGenreData } = useTheme();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken') || '';        
        const response = await api.user.getAllGenres(token);
        
        if (response && response.genres && response.genres.length > 0) {
          setGenres(response.genres);
        } else if (response && Array.isArray(response)) {
          setGenres(response);
        } else {
          console.warn('Unexpected API response format:', response);
          setError('No genres available at this time.');
        }
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError('Failed to load genres. Please try again later.');
        toast.error('Failed to load genres');
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

  // Helper function to get a color for a genre
  const getGenreColor = (genreName: string) => {
    // Expanded default colors list with vibrant gradients
    const defaultColors = [
      'from-blue-500 to-blue-700',
      'from-purple-500 to-purple-700',
      'from-green-500 to-green-700',
      'from-red-500 to-red-700',
      'from-yellow-500 to-yellow-700',
      'from-pink-500 to-pink-700',
      'from-indigo-500 to-indigo-700',
      'from-teal-500 to-teal-700',
      'from-orange-500 to-orange-700',
      'from-cyan-500 to-cyan-700',
      'from-lime-500 to-lime-700',
      'from-emerald-500 to-emerald-700',
      'from-rose-500 to-rose-700',
      'from-fuchsia-500 to-fuchsia-700',
      'from-amber-500 to-amber-700',
      'from-violet-500 to-violet-700',
      'from-sky-500 to-sky-700',
    ];
    
    // Create a more consistent hash function based on the genre name
    const hash = genreName.split('').reduce((acc, char, index) => {
      return acc + char.charCodeAt(0) * (index + 1);
    }, 0);
    
    return defaultColors[Math.abs(hash) % defaultColors.length];
  };

  return (
    <div className="container mx-auto p-4 md:p-6 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
          Discover
        </h1>
        <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
          Explore music by genres and discover new sounds
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i}
              className="h-32 md:h-40 rounded-lg animate-pulse"
              style={{
                backgroundColor: theme === 'light' ? '#f3f4f6' : 'rgba(255, 255, 255, 0.1)'
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div className={`p-4 rounded-md ${theme === 'light' ? 'bg-red-50 text-red-800' : 'bg-red-900/30 text-red-400'}`}>
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {genres.map((genre) => {
            const colorClass = getGenreColor(genre.name);

            return (
              <Link 
                href={{
                  pathname: `/discover/${genre.id}`,
                }} 
                key={genre.id}
                onClick={() => {
                  const dominantColor = getDominantHexColor(colorClass);
                  updateGenreData(genre.name, dominantColor || '');
                }}
              >
                <div 
                  className={`relative h-32 md:h-40 rounded-lg overflow-hidden group cursor-pointer
                    bg-gradient-to-br ${colorClass}
                    hover:shadow-lg transition-all duration-300
                  `}
                >
                  {/* Pattern overlay */}
                  <div className="absolute inset-0 opacity-10"></div>
                  
                  {/* Dark overlay for better text contrast */}
                  <div className="absolute inset-0 bg-black opacity-30 group-hover:opacity-40 transition-opacity"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h3 className="text-white text-lg md:text-xl font-bold text-center px-4 drop-shadow-md">
                      {genre.name}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}