import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Track } from '@/types';

type TrackContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  loop: boolean;
  shuffle: boolean;
  duration: number;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTrack = (track: Track) => {
    if (!track.audioUrl) {
      console.error("Audio URL is missing for this track.");
      return;
    }
  
    if (!audioRef.current) return;
  
    if (currentTrack?.id !== track.id) {
      audioRef.current.src = track.audioUrl;
      setProgress(0);
    }
  
    setCurrentTrack(track);
    setIsPlaying(true);
    audioRef.current.play().catch((error) => console.error('Playback error:', error));
  };

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

  const skipRandom = () => {
    const randomIndex = Math.floor(Math.random() * trackQueue.length);
    setCurrentIndex(randomIndex);
    playTrack(trackQueue[randomIndex]);
  }

  const skipNext = () => {
    if (!trackQueue.length) return;
    let nextIndex = shuffle ? Math.floor(Math.random() * trackQueue.length) : currentIndex + 1;
    if (nextIndex >= trackQueue.length) nextIndex = 0;

    setCurrentIndex(nextIndex);
    playTrack(trackQueue[nextIndex]);
  };

  const skipPrevious = () => {
    if (!trackQueue.length) return;
    let prevIndex = shuffle ? Math.floor(Math.random() * trackQueue.length) : currentIndex - 1;
    if (prevIndex < 0) prevIndex = trackQueue.length - 1;

    setCurrentIndex(prevIndex);
    playTrack(trackQueue[prevIndex]);
  };

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      audioRef.current.loop = loop;

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current!.duration && !isNaN(audioRef.current!.duration)) {
          setProgress((audioRef.current!.currentTime / audioRef.current!.duration) * 100);
        }
      };

      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };

      audioRef.current.onended = () => {
        if (loop) {
          audioRef.current!.currentTime = 0;
          audioRef.current!.play().catch((error) => console.error('Error playing track after loop:', error));
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
          skipNext();
        }
      };
    } else {
      audioRef.current.volume = volume;
      audioRef.current.loop = loop;
    }
  }, [loop, volume, skipNext]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [trackQueue]);

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
