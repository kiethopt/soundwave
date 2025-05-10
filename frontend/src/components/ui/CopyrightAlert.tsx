'use client';

import { Music, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the type for copyright detection results
export interface CopyrightInfo {
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  label?: string;
  similarity?: number; // Optional: if you want to show similarity score
  songLink?: string; // This can be a generic link or fallback
  spotifyLink?: string; // Specific link for Spotify
  youtubeLink?: string; // Specific link for YouTube
  isBlocking: boolean;
}

// Component to display copyright information
export const CopyrightAlert = ({ copyright, theme }: { copyright: CopyrightInfo, theme: 'light' | 'dark' }) => {
  const alertType = copyright.isBlocking ? 'error' : 'info';
  const alertStyles = {
    error: {
      light: 'border-orange-400 bg-orange-50 text-orange-800',
      dark: 'border-orange-600 bg-orange-900/20 text-orange-200'
    },
    info: {
      light: 'border-blue-400 bg-blue-50 text-blue-800',
      dark: 'border-blue-600 bg-blue-900/20 text-blue-200'
    }
  };
  const iconStyles = {
    error: {
      light: 'text-orange-500',
      dark: 'text-orange-400'
    },
    info: {
      light: 'text-blue-500',
      dark: 'text-blue-400'
    }
  };
  const musicIconBgStyles = {
    error: {
      light: 'bg-orange-100',
      dark: 'bg-orange-900/30'
    },
    info: {
      light: 'bg-blue-100',
      dark: 'bg-blue-900/30'
    }
  }
  const linkStyles = {
    error: {
      light: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      dark: 'bg-orange-800/30 text-orange-300 hover:bg-orange-800/50'
    },
    info: {
      light: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      dark: 'bg-blue-800/30 text-blue-300 hover:bg-blue-800/50'
    }
  }
  const messageStyles = {
    error: {
      light: 'text-orange-700',
      dark: 'text-orange-300'
    },
    info: {
      light: 'text-blue-700',
      dark: 'text-blue-300'
    }
  }

  return (
    <div 
      className={cn(
        "mt-4 p-4 rounded-lg border-l-4 flex flex-col gap-3",
        alertStyles[alertType][theme]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {alertType === 'error' ? (
            <AlertTriangle className={cn("h-5 w-5", iconStyles[alertType][theme])} />
          ) : (
            <Info className={cn("h-5 w-5", iconStyles[alertType][theme])} />
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium">{copyright.isBlocking ? 'Copyright Match Detected' : 'Potential Match Information'}</h3>
          <p className="text-xs mt-1 opacity-80">
            {copyright.isBlocking
              ? 'The uploaded audio appears to match an existing copyrighted track.'
              : 'The uploaded audio matches the following track. Please review carefully before proceeding.' // Modified for generic use
            }
          </p>
        </div>
      </div>

      <div className={cn(
        "rounded-md p-3 flex flex-col md:flex-row gap-4",
        theme === 'light' ? 'bg-white shadow-sm' : 'bg-black/20 shadow-inner'
      )}>
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
          musicIconBgStyles[alertType][theme]
        )}>
          <Music className={cn("h-6 w-6", iconStyles[alertType][theme])} />
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium">{copyright.title}</h4>
          <p className={cn("text-sm", theme === 'light' ? 'text-gray-600' : 'text-gray-400')}>
            by <span className="font-medium">{copyright.artist}</span>
            {copyright.album && <> &middot; {copyright.album}</>}
          </p>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
            {copyright.releaseDate && (
              <div className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                <span>Released: {copyright.releaseDate}</span>
              </div>
            )}
            {copyright.label && (
              <div className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                <span>Label: {copyright.label}</span>
              </div>
            )}
          </div>
          
          {/* Link Section */}
          <div className="mt-3 flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-2">
            {copyright.songLink && !copyright.spotifyLink && !copyright.youtubeLink && ( // Fallback if specific links aren't available
              <a
                href={copyright.songLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 transition-colors",
                  linkStyles[alertType][theme]
                )}
              >
                View Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {copyright.spotifyLink && (
              <a
                href={copyright.spotifyLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 transition-colors",
                  // Consider specific styling for Spotify if desired, e.g., green-ish
                  linkStyles[alertType][theme], // Using general link style for now
                  theme === 'light' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-800/30 text-green-300 hover:bg-green-800/50'

                )}
              >
                {/* Optional: Spotify Icon */}
                Check on Spotify <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {copyright.youtubeLink && (
              <a
                href={copyright.youtubeLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 transition-colors",
                  // Consider specific styling for YouTube if desired, e.g., red-ish
                  linkStyles[alertType][theme], // Using general link style for now
                  theme === 'light' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-800/30 text-red-300 hover:bg-red-800/50'
                )}
              >
                {/* Optional: YouTube Icon */}
                Check on YouTube <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
      
      <div className={cn("text-xs px-1", messageStyles[alertType][theme])}>
        {copyright.isBlocking
          ? 'To upload this track, you generally need permission to use this content. If this is your content and it was blocked in error, ensure your artist name matches or contact support for verification.'
          : 'If this is not your content, or if you do not have the rights to use it, please do not proceed with the upload.'
        }
      </div>
    </div>
  );
};

// Helper function for frontend name normalization (can also be shared or kept here if specific to copyright)
export const normalizeArtistNameForFrontend = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
}; 