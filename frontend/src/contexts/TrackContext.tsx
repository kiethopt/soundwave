import { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { Track } from '@/types';
import { set } from 'lodash';

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
  
  // Update ref whenever trackQueue changes
  useEffect(() => {
    trackQueueRef.current = trackQueue;
  }, [trackQueue]);


  const playTrack = useCallback((track: Track) => {
    if (!track.audioUrl) {
      console.error("Audio URL is missing for this track.");
      return;
    }

    if (!audioRef.current) return;

    if (currentTrack?.id !== track.id) {
      audioRef.current.src = track.audioUrl;
      setProgress(0);
    }

    const newIndex = trackQueueRef.current.findIndex((t) => t.id === track.id);
    if (newIndex !== -1) {
      setCurrentIndex(newIndex);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((error) => console.error('Playback error:', error));
  }, [currentTrack]);

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
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      if (loop) {
        audio.currentTime = 0;
        audio.play().catch((error) => console.error('Error playing track after loop:', error));
      } else if (shuffle) {
        setIsPlaying(false);
        skipRandom();
      } 
      else {
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
  }, [loop, volume, skipNext]);

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