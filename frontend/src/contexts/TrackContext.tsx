'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Track } from '@/types';
import { api } from '@/utils/api';
import { Loop } from '../components/ui/Icons';

interface TrackContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  loop: boolean;
  shuffle: boolean;
  duration: number;
  queueType: string;
  showPlayer: boolean;
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
  togglePlayPause: () => void;
  queue: Track[];
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
}

export const TrackContext = createContext<TrackContextType>({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  progress: 0,
  loop: false,
  shuffle: false,
  duration: 0,
  queueType: 'track',
  showPlayer: false,
  setQueueType: () => {},
  playTrack: () => {},
  pauseTrack: () => {},
  trackQueue: () => {},
  setVolume: () => {},
  seekTrack: () => {},
  toggleLoop: () => {},
  toggleShuffle: () => {},
  skipRandom: () => {},
  skipNext: () => {},
  skipPrevious: () => {},
  togglePlayPause: () => {},
  queue: [],
  addToQueue: () => {},
  removeFromQueue: () => {},
  clearQueue: () => {},
  reorderQueue: () => {},
});

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
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackQueueRef = useRef<Track[]>([]);
  const tabId = useRef(Math.random().toString(36).substring(2, 15)).current;
  const broadcastChannel = useRef<BroadcastChannel | null>(null);

  // Thêm một ref để theo dõi request hiện tại
  const currentPlayRequestRef = useRef<AbortController | null>(null);

  // Initialize audio and broadcast channel
  useEffect(() => {
    audioRef.current = new Audio();
    broadcastChannel.current = new BroadcastChannel('musicPlayback');
    const token = localStorage.getItem('userToken');
    if (token) setToken(token);

    // Clean up function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (broadcastChannel.current) {
        broadcastChannel.current.close();
      }
    };
  }, []);

  // Update ref whenever trackQueue changes
  useEffect(() => {
    trackQueueRef.current = trackQueue;
  }, [trackQueue]);

  const saveHistory = useCallback(
    async (trackId: string, duration: number, completed: boolean) => {
      if (!token) return;

      try {
        await api.history.savePlayHistory(
          { trackId, duration, completed },
          token
        );
      } catch (error) {
        console.error('Failed to save play history:', error);
      }
    },
    [token]
  );

  const playTrack = useCallback(
    async (track: Track) => {
      if (!track.audioUrl) {
        console.error('Audio URL is missing for this track.');
        return;
      }

      if (!audioRef.current) return;

      try {
        // Hủy request cũ nếu có
        if (currentPlayRequestRef.current) {
          currentPlayRequestRef.current.abort();
        }

        // Tạo AbortController mới cho request hiện tại
        currentPlayRequestRef.current = new AbortController();

        if (broadcastChannel.current) {
          broadcastChannel.current.postMessage({ type: 'play', tabId });
        }

        setShowPlayer(true);

        // Nếu đang phát cùng một track
        if (currentTrack?.id === track.id) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Playback error:', error);
              setIsPlaying(false);
            }
          }
          return;
        }

        // Reset các state khi chuyển bài
        setPlayStartTime(Date.now());
        setLastSavedTime(0);
        setProgress(0);

        // Tạm dừng audio hiện tại trước khi load bài mới
        audioRef.current.pause();

        // Load source mới
        audioRef.current.src = track.audioUrl;
        audioRef.current.currentTime = 0;

        const newIndex = trackQueueRef.current.findIndex(
          (t) => t.id === track.id
        );
        if (newIndex !== -1) {
          setCurrentIndex(newIndex);
        }

        setCurrentTrack(track);
        setIsPlaying(true);

        // Đợi audio load xong và phát
        await new Promise((resolve, reject) => {
          const handleCanPlay = () => {
            audioRef.current?.removeEventListener('canplay', handleCanPlay);
            resolve(null);
          };

          const handleError = (error: Event) => {
            audioRef.current?.removeEventListener('error', handleError);
            reject(error);
          };

          audioRef.current?.addEventListener('canplay', handleCanPlay);
          audioRef.current?.addEventListener('error', handleError);
        });

        // Kiểm tra xem có bị abort không trước khi play
        if (!currentPlayRequestRef.current?.signal.aborted) {
          await audioRef.current.play();
          saveHistory(track.id, 0, false);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Playback error:', error);
          setIsPlaying(false);
        }
      }
    },
    [currentTrack, saveHistory, tabId]
  );

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const seekTrack = useCallback(
    (position: number) => {
      if (audioRef.current && duration > 0) {
        const newTime = (position / 100) * duration;
        audioRef.current.currentTime = newTime;
        setProgress(position);
      }
    },
    [duration]
  );

  const toggleLoop = useCallback(() => setLoop((prev) => !prev), []);
  const toggleShuffle = useCallback(() => setShuffle((prev) => !prev), []);

  const setAudioVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setVolume(newVolume);
  }, []);

  const loopTrack = useCallback(async() => {
    if (trackQueueRef.current.length === 0) return;

    const currentTrack = trackQueueRef.current[currentIndex];
    if (currentTrack) {
      playTrack(currentTrack);
    }

  }, [currentIndex, playTrack]);

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

  const skipNext = useCallback(async () => {
    if (!trackQueueRef.current.length) return;

    try {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= trackQueueRef.current.length) {
        nextIndex = 0;
      }

      const nextTrack = trackQueueRef.current[nextIndex];
      if (nextTrack) {
        setCurrentIndex(nextIndex);
        await playTrack(nextTrack);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error skipping to next track:', error);
      }
    }
  }, [currentIndex, playTrack]);

  const skipPrevious = useCallback(async () => {
    if (!trackQueueRef.current.length) return;

    try {
      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = trackQueueRef.current.length - 1;
      }

      const prevTrack = trackQueueRef.current[prevIndex];
      if (prevTrack) {
        setCurrentIndex(prevIndex);
        await playTrack(prevTrack);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error skipping to previous track:', error);
      }
    }
  }, [currentIndex, playTrack]);

  // Quản lý audio và tab synchronization
  useEffect(() => {
    if (!audioRef.current || !broadcastChannel.current) return;

    const audio = audioRef.current;
    audio.volume = volume;
    audio.loop = false; 

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        requestAnimationFrame(() => {
          setProgress((audio.currentTime / audio.duration) * 100);
        });

        if (
          currentTrack &&
          playStartTime &&
          audio.currentTime - lastSavedTime >= 30
        ) {
          const duration = Math.floor(audio.currentTime);
          saveHistory(currentTrack.id, duration, false);
          setLastSavedTime(audio.currentTime);
        }
      }
    };

    const handleMetadataLoaded = () => {
      const duration = audio.duration;
      if (duration && !isNaN(duration)) {
        setDuration(duration);
      } else {
        setDuration(0);
      }
    };

    const handleEnded = () => {
      if (currentTrack && playStartTime) {
        const duration = Math.floor(audio.duration);
        saveHistory(currentTrack.id, duration, true);
      }

      if (loop) {
        setIsPlaying(false);
        loopTrack();
      } else if (shuffle) {
        setIsPlaying(false);
        skipRandom();
      } else {
        setIsPlaying(false);
        skipNext();
      }
    };

    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data.type === 'play' && event.data.tabId !== tabId) {
        // Nếu tab khác đã bắt đầu phát, tạm dừng tab hiện tại
        pauseTrack();
      }
    };

    audio.addEventListener('loadedmetadata', handleMetadataLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    broadcastChannel.current.addEventListener(
      'message',
      handleBroadcastMessage
    );

    const handleBeforeUnload = () => {
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({ type: 'stop', tabId });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      audio.removeEventListener('loadedmetadata', handleMetadataLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (broadcastChannel.current) {
        broadcastChannel.current.removeEventListener(
          'message',
          handleBroadcastMessage
        );
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    loop,
    volume,
    skipNext,
    skipRandom,
    currentTrack,
    playStartTime,
    lastSavedTime,
    saveHistory,
    pauseTrack,
    tabId,
    loopTrack,
  ]);

  useEffect(() => {
    return () => {
      if (currentPlayRequestRef.current) {
        currentPlayRequestRef.current.abort();
      }
    };
  }, []);

  // Update trackQueue function to set both state and ref
  const setTrackQueueFn = useCallback((tracks: Track[]) => {
    setTrackQueue(tracks);
    trackQueueRef.current = tracks;
    setQueue(tracks);
  }, []);

  // Add new queue management functions
  const addToQueue = useCallback((track: Track) => {
    setQueue((prevQueue) => {
      // Check if the track already exists in the queue
      const isTrackInQueue = prevQueue.some((item) => item.id === track.id);

      // Only add the track if it's not already in the queue
      if (!isTrackInQueue) {
        const newQueue = [...prevQueue, track];
        return newQueue;
      }

      // Return the unchanged queue if the track already exists
      return prevQueue;
    });

    // Also update the trackQueue if it's empty
    if (trackQueueRef.current.length === 0) {
      setTrackQueue([track]);
      trackQueueRef.current = [track];
    }
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((prevQueue) => {
        const newQueue = prevQueue.filter((_, i) => i !== index);

        // If removing current track, play next track if available
        if (index === currentIndex) {
          if (newQueue.length > 0) {
            const nextIndex = Math.min(index, newQueue.length - 1);
            setCurrentIndex(nextIndex);
            playTrack(newQueue[nextIndex]);
          } else {
            pauseTrack();
            setCurrentTrack(null);
          }
        } else if (index < currentIndex) {
          // Adjust currentIndex if removing a track before it
          setCurrentIndex(currentIndex - 1);
        }

        // Update trackQueue ref
        setTrackQueue(newQueue);
        trackQueueRef.current = newQueue;

        return newQueue;
      });
    },
    [currentIndex, pauseTrack, playTrack]
  );

  const clearQueue = useCallback(() => {
    pauseTrack();
    setCurrentTrack(null);
    setQueue([]);
    setTrackQueue([]);
    trackQueueRef.current = [];
    setCurrentIndex(0);
  }, [pauseTrack]);

  const reorderQueue = useCallback(
    (startIndex: number, endIndex: number) => {
      setQueue((prevQueue) => {
        const result = Array.from(prevQueue);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        // Update trackQueue
        setTrackQueue(result);
        trackQueueRef.current = result;

        // Update currentIndex if the current track was moved
        if (currentIndex === startIndex) {
          setCurrentIndex(endIndex);
        } else if (startIndex < currentIndex && endIndex >= currentIndex) {
          setCurrentIndex(currentIndex - 1);
        } else if (startIndex > currentIndex && endIndex <= currentIndex) {
          setCurrentIndex(currentIndex + 1);
        }

        return result;
      });
    },
    [currentIndex]
  );

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
        trackQueue: setTrackQueueFn,
        queueType,
        setQueueType,
        skipRandom,
        seekTrack,
        toggleLoop,
        toggleShuffle,
        skipNext,
        skipPrevious,
        showPlayer,
        togglePlayPause: pauseTrack,
        queue,
        addToQueue,
        removeFromQueue,
        clearQueue,
        reorderQueue,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
};

export const useTrack = () => {
  const context = useContext(TrackContext);
  if (context === undefined) {
    throw new Error('useTrack must be used within a TrackProvider');
  }
  return context;
};
