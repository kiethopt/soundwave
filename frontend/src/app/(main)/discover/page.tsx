'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Genre } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { api } from '@/utils/api';
import { getDominantHexColor } from '@/utils/tailwind-color-map';
import { useRouter } from 'next/navigation';
import { useBackground } from '@/contexts/BackgroundContext';

export default function DiscoveryPage() {
  const { theme, updateGenreData } = useTheme();
  const { setBackgroundStyle } = useBackground();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [firstGenreColor, setFirstGenreColor] = useState<string | null>(null);
  const [hoveredGenreColor, setHoveredGenreColor] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.replace('/login'); 
      return;
    }

    const fetchGenres = async () => {
      try {
        setLoading(true);
        const response = await api.user.getDiscoverGenres(token);
        
        if (Array.isArray(response)) {
          setGenres(response);
        } else {
          console.warn('Unexpected API response format for discover genres:', response);
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
  }, [router]);

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

  // Set the first genre color when genres are loaded
  useEffect(() => {
    if (genres.length > 0) {
      const firstGenreColorClass = getGenreColor(genres[1].name);
      const dominantColor = getDominantHexColor(firstGenreColorClass);
      setFirstGenreColor(dominantColor);
      updateGenreData(genres[0].id, genres[0].name, dominantColor || '');
    }
  }, [genres, updateGenreData]);

  // Handle genre hover
  const handleGenreHover = (genreName: string) => {
    const colorClass = getGenreColor(genreName);
    const dominantColor = getDominantHexColor(colorClass);
    setHoveredGenreColor(dominantColor);
  };

  // Handle genre hover end
  const handleGenreHoverEnd = () => {
    setHoveredGenreColor(null);
  };

  const currentBackgroundColor = hoveredGenreColor || firstGenreColor;

  // Effect to update background using context
  useEffect(() => {
    const newBackground = currentBackgroundColor
      ? `linear-gradient(180deg, 
          ${currentBackgroundColor}50 0%, 
          ${currentBackgroundColor}25 15%, 
          ${currentBackgroundColor}10 30%, 
          ${theme === 'light' ? '#ffffff' : '#121212'} 100%)`
      : theme === 'light'
      ? 'linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)'
      : 'linear-gradient(180deg, #2c2c2c 0%, #121212 100%)';
      
    setBackgroundStyle(newBackground);

    // Cleanup function to reset background on unmount
    return () => {
       const defaultBackground = theme === 'light'
         ? '#ffffff' 
         : '#121212';
       setBackgroundStyle(defaultBackground);
    };
  }, [currentBackgroundColor, theme, setBackgroundStyle]);

  return (
    <div 
      className="container mx-auto p-4 md:p-6 mb-16 md:mb-0 transition-colors duration-1000 ease"
    >
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
                  updateGenreData(genre.id, genre.name, dominantColor || '');
                }}
                onMouseEnter={() => handleGenreHover(genre.name)}
                onMouseLeave={handleGenreHoverEnd}
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