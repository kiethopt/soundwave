import { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { Track } from '@/types';
import { api } from '@/utils/api';
type TrackContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  loop: boolean;
  shuffle: boolean;
  duration: number;
  queueType: string;
  setQueueType: (queueType: string) => void;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  trackQueue: (tracks: Track[]) => void;
  setVolume: (volume: number) => void;
  seekTrack: (position: number) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  skipRandom: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
};

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const TrackProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [shuffle, setShuffle] = useState(false);
  const [trackQueue, setTrackQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [queueType, setQueueType] = useState<string>('track');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackQueueRef = useRef<Track[]>([]);
  const token = localStorage.getItem('userToken');
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number>(0);
  
  // Update ref whenever trackQueue changes
  useEffect(() => {
    trackQueueRef.current = trackQueue;
  }, [trackQueue]);

  const saveHistory = useCallback(async (trackId: string, duration: number, completed: boolean) => {
    if (!token) return;
    
    try {
      await api.history.savePlayHistory({ trackId, duration, completed }, token);
    } catch (error) {
      console.error('Failed to save play history:', error);
    }
  }, [token]);

  const playTrack = useCallback(async (track: Track) => {
    if (!track.audioUrl) {
      console.error("Audio URL is missing for this track.");
      return;
    }
  
    if (!audioRef.current) return;
  
    // Check if the same track is being played
    if (currentTrack?.id === track.id) {
      audioRef.current.play().catch(error => {
        console.error("Playback error:", error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
      return;
    }
  
    // Reset play tracking state for new track
    setPlayStartTime(Date.now());
    setLastSavedTime(0);
  
    // Only update src when switching to a new track
    audioRef.current.src = track.audioUrl;
    audioRef.current.currentTime = 0;
    setProgress(0);
  
    const newIndex = trackQueueRef.current.findIndex((t) => t.id === track.id);
    if (newIndex !== -1) {
      setCurrentIndex(newIndex);
    }
  
    setCurrentTrack(track);
    setIsPlaying(true);
  
    try {
      await audioRef.current.play();
      saveHistory(track.id, 0, false).catch(error => {
        console.error("Failed to save initial play history:", error);
      });
    } catch (error) {
      console.error("Playback error:", error);
      setIsPlaying(false);
    }
  }, [currentTrack, saveHistory]);
  

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  const seekTrack = (position: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (position / 100) * audioRef.current.duration;
      setProgress(position);
    }
  };

  const toggleLoop = () => setLoop(!loop);
  const toggleShuffle = () => setShuffle(!shuffle);

  const setAudioVolume = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setVolume(newVolume);
  };

  const skipRandom = useCallback(() => {
    if (trackQueueRef.current.length <= 1) return;
  
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * trackQueueRef.current.length);
    } while (randomIndex === currentIndex);
  
    const randomTrack = trackQueueRef.current[randomIndex];
    if (randomTrack) {
      setCurrentIndex(randomIndex);
      playTrack(randomTrack);
    }
  }, [currentIndex, playTrack]);

  const skipNext = useCallback(() => {
    if (!trackQueueRef.current.length) return;
    
    let nextIndex = currentIndex + 1;
    if (nextIndex >= trackQueueRef.current.length) {
      nextIndex = 0;
    }
    
    const nextTrack = trackQueueRef.current[nextIndex];
    if (nextTrack) {
      setCurrentIndex(nextIndex);
      playTrack(nextTrack);
    }
  }, [currentIndex, playTrack]);

  const skipPrevious = useCallback(() => {
    if (!trackQueueRef.current.length) return;
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = trackQueueRef.current.length - 1;
    }

    const prevTrack = trackQueueRef.current[prevIndex];
    if (prevTrack) {
      setCurrentIndex(prevIndex);
      playTrack(prevTrack);
    }
  }, [currentIndex, playTrack]);
  
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    audio.volume = volume;
    audio.loop = loop;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const currentProgress = (audio.currentTime / audio.duration) * 100;
        setProgress(currentProgress);
    
        if (currentTrack && playStartTime && audio.currentTime - lastSavedTime >= 30) {
          const duration = Math.floor(audio.currentTime);
          const completed = false; 
          
          saveHistory(currentTrack.id, duration, completed);
          setLastSavedTime(audio.currentTime);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    }

    const handleEnded = () => {
      if (currentTrack && playStartTime) {
        const duration = Math.floor(audio.duration);
        saveHistory(currentTrack.id, duration, true);
      }
    
      if (loop) {
        audio.currentTime = 0;
        audio.play().catch((error) => console.error('Error playing track after loop:', error));
      } else if (shuffle) {
        setIsPlaying(false);
        skipRandom();
      } else {
        setIsPlaying(false);
        skipNext();
      }
    };

    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Cleanup event listeners
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [loop, volume, skipNext, currentTrack, playStartTime, lastSavedTime, saveHistory]);

  return (
    <TrackContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        progress,
        loop,
        shuffle,
        playTrack,
        pauseTrack,
        duration,
        setVolume: setAudioVolume,
        trackQueue: setTrackQueue,
        queueType,
        setQueueType: setQueueType,
        skipRandom,
        seekTrack,
        toggleLoop,
        toggleShuffle,
        skipNext,
        skipPrevious,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
};

export const useTrack = () => {
  const context = useContext(TrackContext);
  if (!context) {
    throw new Error('useTrack must be used within a TrackProvider');
  }
  return context;
};