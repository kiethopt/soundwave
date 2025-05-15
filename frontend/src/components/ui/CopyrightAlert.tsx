'use client';

import { Music, AlertTriangle, Info, ExternalLink, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the type for copyright detection results
export interface CopyrightInfo {
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  label?: string;
  similarity?: number;
  songLink?: string;
  spotifyLink?: string; 
  youtubeLink?: string; 
  isBlocking: boolean;
  localFingerprint?: string;
  isLocalFingerprintConflict?: boolean;
  conflictingTrackTitle?: string;
  conflictingArtistName?: string;
  isDuplicateBySameArtist?: boolean;
  existingTrackTitle?: string;
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

  const isLocalConflict = copyright.isLocalFingerprintConflict === true;
  const isSelfDuplicate = copyright.isDuplicateBySameArtist === true;

  let mainTitle = copyright.isBlocking ? 'Copyright Match Detected' : 'Potential Match Information';
  let mainMessage = copyright.isBlocking
    ? 'The uploaded audio appears to match an existing copyrighted track.'
    : 'The uploaded audio matches the following track. Please review carefully before proceeding.';

  // Determine alert type based on the new isSelfDuplicate flag as well
  const effectiveAlertType = (isLocalConflict || isSelfDuplicate || copyright.isBlocking) ? 'error' : 'info';

  if (isLocalConflict) {
    mainTitle = 'Local Content Conflict';
    mainMessage = `This audio content matches a track already on our platform: "${copyright.conflictingTrackTitle || 'Unknown Track'}" by ${copyright.conflictingArtistName || 'another artist'}.`;
  } else if (isSelfDuplicate) {
    mainTitle = 'Duplicate Content by You';
    mainMessage = `You have already uploaded this audio content as "${copyright.existingTrackTitle || copyright.title || 'Your Existing Track'}. A new track will not be created.`;
    // For self-duplicates, it's often informational or a warning, not always a hard block in UI (backend might block creation)
    // copyright.isBlocking might be false here if the backend just wants to inform.
  }

  const displayTitle = isLocalConflict 
    ? (copyright.conflictingTrackTitle || 'N/A') 
    : isSelfDuplicate 
      ? (copyright.existingTrackTitle || copyright.title || 'Your Existing Track') 
      : copyright.title;
  const displayArtist = isLocalConflict 
    ? (copyright.conflictingArtistName || 'N/A') 
    : copyright.artist; // For self-duplicate, artist is the current user, so copyright.artist should be correct.
  
  // Album and other details are generally not shown for these specific alerts, or are part of the main message.
  const displayAlbum = (isLocalConflict || isSelfDuplicate) ? undefined : copyright.album;
  const displayReleaseDate = (isLocalConflict || isSelfDuplicate) ? undefined : copyright.releaseDate;
  const displayLabel = (isLocalConflict || isSelfDuplicate) ? undefined : copyright.label;
  const showLinks = !(isLocalConflict || isSelfDuplicate) && (copyright.songLink || copyright.spotifyLink || copyright.youtubeLink);

  return (
    <div 
      className={cn(
        "mt-4 p-4 rounded-lg border-l-4 flex flex-col gap-3",
        alertStyles[effectiveAlertType][theme] // Use effectiveAlertType
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isSelfDuplicate ? (
            <XCircle className={cn("h-5 w-5", theme === 'light' ? 'text-red-500' : 'text-red-400')} />
          ) : effectiveAlertType === 'error' ? (
            <AlertTriangle className={cn("h-5 w-5", iconStyles[effectiveAlertType][theme])} />
          ) : (
            <Info className={cn("h-5 w-5", iconStyles[effectiveAlertType][theme])} />
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium">{mainTitle}</h3>
          <p className="text-xs mt-1 opacity-80">
            {mainMessage}
          </p>
        </div>
      </div>

      <div className={cn(
        "rounded-md p-3 flex flex-col md:flex-row gap-4",
        theme === 'light' ? 'bg-white shadow-sm' : 'bg-black/20 shadow-inner'
      )}>
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
          musicIconBgStyles[effectiveAlertType][theme] // Use effectiveAlertType
        )}>
          <Music className={cn("h-6 w-6", iconStyles[effectiveAlertType][theme])} />
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium">{displayTitle}</h4>
          <p className={cn("text-sm", theme === 'light' ? 'text-gray-600' : 'text-gray-400')}>
            by <span className="font-medium">{displayArtist}</span>
            {displayAlbum && <> &middot; {displayAlbum}</>}
          </p>
          
          {displayReleaseDate && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              <Info className="h-3.5 w-3.5" />
              <span>Released: {displayReleaseDate}</span>
            </div>
          )}
          {displayLabel && (
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Info className="h-3.5 w-3.5" />
              <span>Label: {displayLabel}</span>
            </div>
          )}
              
          {showLinks && (
            <div className="mt-3 flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-2">
              {copyright.songLink && !copyright.spotifyLink && !copyright.youtubeLink && (
                <a
                  href={copyright.songLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 transition-colors",
                    linkStyles[effectiveAlertType][theme] // Use effectiveAlertType
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
                    linkStyles[effectiveAlertType][theme], // Use effectiveAlertType
                    theme === 'light' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-800/30 text-green-300 hover:bg-green-800/50'
                  )}
                >
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
                    linkStyles[effectiveAlertType][theme], // Use effectiveAlertType
                    theme === 'light' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-800/30 text-red-300 hover:bg-red-800/50'
                  )}
                >
                  Check on YouTube <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className={cn("text-xs px-1", messageStyles[effectiveAlertType][theme])}>
        {isLocalConflict 
          ? `This audio content is identical to material already on our platform by another artist. Uploading this content is not permitted.`
          : isSelfDuplicate
            ? `You've already uploaded this exact audio. If you need to add it to an album or update details, please manage the existing track via your dashboard.`
            : copyright.isBlocking
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