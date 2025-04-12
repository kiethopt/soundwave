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
import io, { Socket } from 'socket.io-client'; // Import Socket type


// Helper function to get initial volume from localStorage
const getInitialVolume = (): number => {
  if (typeof window === 'undefined') return 1;
  
  const savedVolume = localStorage.getItem('userVolume');
  if (savedVolume !== null) {
    const parsedVolume = parseFloat(savedVolume);
    if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
      return parsedVolume;
    }
  }
  return 1;
};

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
  const [volume, setVolume] = useState(getInitialVolume());
  const [loop, setLoop] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [shuffle, setShuffle] = useState(false);
  const [trackQueue, setTrackQueue] = useState<Track[]>([]); // Main queue for playback logic
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [queueType, setQueueType] = useState<string>('track');
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number>(0);
  // Removed token state as it wasn't used after initialization
  const [showPlayer, setShowPlayer] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]); // Queue for display/management UI

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackQueueRef = useRef<Track[]>([]);
  const tabId = useRef(Math.random().toString(36).substring(2, 15)).current;
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  const currentPlayRequestRef = useRef<AbortController | null>(null);

  // Initialize audio and broadcast channel
  useEffect(() => {
    audioRef.current = new Audio();
    broadcastChannel.current = new BroadcastChannel('musicPlayback');
    // Removed token setting as state wasn't used

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
      const currentToken = localStorage.getItem('userToken');
      if (!currentToken) return;

      try {
        await api.history.savePlayHistory(
          { trackId, duration, completed },
          currentToken
        );
      } catch (error) {
        console.error('Failed to save play history:', error);
      }
    },
    []
  );

  // Add function to reorganize queue when a track is selected
  const reorderQueueFromSelected = useCallback((tracks: Track[], selectedIndex: number) => {
    if (selectedIndex < 0 || selectedIndex >= tracks.length) return tracks;
    
    // Split the array at the selected index
    const firstPart = tracks.slice(0, selectedIndex);
    const secondPart = tracks.slice(selectedIndex);
    
    // Combine the arrays so selected track comes first, followed by the rest in order
    return [...secondPart, ...firstPart];
  }, []);

  const playTrack = useCallback(
    async (track: Track) => {
      if (currentPlayRequestRef.current) {
        currentPlayRequestRef.current.abort();
      }
      currentPlayRequestRef.current = new AbortController();
      const signal = currentPlayRequestRef.current.signal;

      if (!audioRef.current) return;

      try {
        let trackToPlay = track;

        // Find the index of the track in the queue
        const trackIndex = trackQueueRef.current.findIndex(
          (t) => t.id === track.id
        );

        // If track is in queue, reorganize the queue
        if (trackIndex !== -1) {
          const reorderedQueue = reorderQueueFromSelected(trackQueueRef.current, trackIndex);
          setTrackQueue(reorderedQueue);
          trackQueueRef.current = reorderedQueue;
          setQueue(reorderedQueue);
          setCurrentIndex(0);
        }

        if (!trackToPlay.audioUrl) {
          console.log(
            `Audio URL missing for ${track.title}, fetching details...`
          );
          const currentToken = localStorage.getItem('userToken');
          if (!currentToken) {
            console.error(
              'Authentication token not found, cannot fetch track details.'
            );
            setIsPlaying(false);
            return;
          }
          const trackDetailResponse = await api.tracks.getById(
            track.id,
            currentToken
          );
          if (signal.aborted) {
            console.log('Track fetch aborted.');
            return;
          }
          if (trackDetailResponse && trackDetailResponse.audioUrl) {
            trackToPlay = trackDetailResponse;
          } else {
            console.error(
              `Failed to fetch track details or audioUrl still missing for ${track.id}`
            );
            setIsPlaying(false);
            return;
          }
        }

        if (broadcastChannel.current) {
          broadcastChannel.current.postMessage({ type: 'play', tabId });
        }

        setShowPlayer(true);

        if (currentTrack?.id === trackToPlay.id) {
          if (isPlaying) {
            return;
          } else {
            try {
              await audioRef.current.play();
              setIsPlaying(true);
            } catch (error) {
              if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Resume playback error:', error);
                setIsPlaying(false);
              }
            }
            return;
          }
        }

        setPlayStartTime(Date.now());
        setLastSavedTime(0);
        setProgress(0);

        audioRef.current.pause();
        audioRef.current.src = trackToPlay.audioUrl;
        audioRef.current.currentTime = 0;
        setDuration(0);

        const newIndex = trackQueueRef.current.findIndex(
          (t) => t.id === trackToPlay.id
        );
        if (newIndex !== -1) {
          setCurrentIndex(newIndex);
        }

        setCurrentTrack(trackToPlay);

        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            audioRef.current?.removeEventListener('canplay', handleCanPlay);
            audioRef.current?.removeEventListener('error', handleError);
            const audioDuration = audioRef.current?.duration;
            if (audioDuration && !isNaN(audioDuration)) {
              setDuration(audioDuration);
            } else {
              setDuration(0);
            }
            resolve();
          };

          const handleError = (e: Event) => {
            audioRef.current?.removeEventListener('canplay', handleCanPlay);
            audioRef.current?.removeEventListener('error', handleError);
            console.error('Audio playback error:', audioRef.current?.error);
            reject(
              new Error(
                `Failed to load audio: ${
                  audioRef.current?.error?.message || 'Unknown error'
                }`
              )
            );
          };

          audioRef.current?.addEventListener('canplay', handleCanPlay);
          audioRef.current?.addEventListener('error', handleError);

          if (
            audioRef.current?.readyState &&
            audioRef.current.readyState >= 3
          ) {
            handleCanPlay();
          }

          const timeoutId = setTimeout(() => {
            audioRef.current?.removeEventListener('canplay', handleCanPlay);
            audioRef.current?.removeEventListener('error', handleError);
            reject(new Error('Audio load timed out after 15 seconds'));
          }, 15000);

          const clearAudioTimeout = () => clearTimeout(timeoutId);
          audioRef.current?.addEventListener('canplay', clearAudioTimeout, {
            once: true,
          });
          audioRef.current?.addEventListener('error', clearAudioTimeout, {
            once: true,
          });
        });

        if (signal.aborted) {
          console.log('Playback aborted while waiting for audio to load.');
          setIsPlaying(false);
          return;
        }

        await audioRef.current.play();
        setIsPlaying(true);
        saveHistory(trackToPlay.id, 0, false);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error in playTrack:', error);
          setIsPlaying(false);
          setCurrentTrack(null);
        } else if (error instanceof Error && error.name === 'AbortError') {
          console.log('playTrack aborted.');
        }
      } finally {
        if (currentPlayRequestRef.current?.signal === signal) {
          currentPlayRequestRef.current = null;
        }
      }
    },
    [currentTrack, isPlaying, saveHistory, tabId, trackQueueRef, reorderQueueFromSelected]
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
    
    // Save volume to localStorage for persistence
    try {
      localStorage.setItem('userVolume', newVolume.toString());
    } catch (error) {
      console.error('Failed to save volume to localStorage:', error);
    }
  }, []);

  const loopTrack = useCallback(async () => {
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

  const skipNext = useCallback(() => {
    if (trackQueueRef.current.length === 0) return;
    if (shuffle) {
      skipRandom();
      return;
    }
    const nextIndex = (currentIndex + 1) % trackQueueRef.current.length;
    if (trackQueueRef.current[nextIndex]) {
        playTrack(trackQueueRef.current[nextIndex]);
    } else {
        // Handle case where queue might be empty or index out of bounds
        pauseTrack();
        setCurrentTrack(null);
    }
  }, [currentIndex, shuffle, playTrack, pauseTrack, skipRandom]);

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

  // WebSocket listener for TrackContext updates
  useEffect(() => {
    let socket: Socket | null = null;
    const connectTimer = setTimeout(() => {
        socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

        socket.on('connect', () => {
          console.log(`[WebSocket] TrackContext connected`);
        });

        socket.on('disconnect', (reason: string) => {
          console.log(`[WebSocket] TrackContext disconnected:`, reason);
        });

        socket.on('connect_error', (error: Error) => {
            console.error(`[WebSocket] TrackContext Connection Error:`, error);
        });

        // --- Track Updated --- 
        socket.on('track:updated', (data: { track: Track }) => {
          const updatedTrack = data.track;
          console.log('[WebSocket] TrackContext received track:updated', updatedTrack);

          // Update current track if it matches
          setCurrentTrack(prevTrack => 
            prevTrack?.id === updatedTrack.id ? { ...prevTrack, ...updatedTrack } : prevTrack
          );

          // Update track in the display queue
          setQueue(prevQueue => 
            prevQueue.map(t => t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t)
          );
          // Update track in the playback queue (trackQueue)
           setTrackQueue(prevPlaybackQueue => 
            prevPlaybackQueue.map(t => t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t)
          );
        });

        // --- Track Deleted --- 
        socket.on('track:deleted', (data: { trackId: string }) => {
          const deletedTrackId = data.trackId;
          console.log('[WebSocket] TrackContext received track:deleted', deletedTrackId);

          // Check if the deleted track is the current track
          if (currentTrack?.id === deletedTrackId) {
            console.log('[WebSocket] Current track deleted, skipping next...');
             // Stop playback and attempt to play the next track
             if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = ''; // Clear source
             }
             setCurrentTrack(null);
             setIsPlaying(false);
             // Recalculate queue without the deleted track before skipping
             const nextQueue = trackQueueRef.current.filter(t => t.id !== deletedTrackId);
             setTrackQueue(nextQueue);
             setQueue(nextQueue); // Update display queue as well
             trackQueueRef.current = nextQueue;

             if (nextQueue.length > 0) {
                // Try to play the track at the current index (which might now be the next track)
                // or wrap around if the deleted track was the last one.
                const nextIndex = Math.min(currentIndex, nextQueue.length - 1);
                 if (nextQueue[nextIndex]) {
                     playTrack(nextQueue[nextIndex]);
                 } else {
                     setCurrentIndex(0); // Reset index if something went wrong
                 }
             } else {
                setCurrentIndex(0); // No tracks left
             }
          } else {
              // If not the current track, just remove from queues
              const nextQueue = queue.filter(t => t.id !== deletedTrackId);
              const nextPlaybackQueue = trackQueue.filter(t => t.id !== deletedTrackId);
              
              setQueue(nextQueue);
              setTrackQueue(nextPlaybackQueue);
              trackQueueRef.current = nextPlaybackQueue;
              // Adjust currentIndex if a track before the current one was removed
               const deletedIndex = trackQueue.findIndex(t => t.id === deletedTrackId);
               if (deletedIndex !== -1 && deletedIndex < currentIndex) {
                   setCurrentIndex(prev => Math.max(0, prev - 1));
               }
          }
        });

        // --- Track Visibility Changed --- 
        socket.on('track:visibilityChanged', (data: { trackId: string; isActive: boolean }) => {
          const { trackId, isActive } = data;
          console.log(`[WebSocket] TrackContext received track:visibilityChanged for ${trackId}: ${isActive}`);

           if (!isActive) { // Only act if track becomes hidden
                let currentArtistId: string | null = null;
                try {
                    const userDataString = localStorage.getItem('userData');
                    if (userDataString) {
                        const userData = JSON.parse(userDataString);
                        currentArtistId = userData?.artistProfile?.id || null;
                    }
                } catch (e) {
                    console.error("Error parsing user data for visibility check:", e);
                }

                 // Check current track
                 if (currentTrack?.id === trackId && currentTrack.artistId !== currentArtistId) {
                    console.log('[WebSocket] Current track hidden and user is not owner, skipping next...');
                     if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.src = '';
                     }
                     setCurrentTrack(null);
                     setIsPlaying(false);
                     // Recalculate queue without the hidden track before skipping
                     const nextQueue = trackQueueRef.current.filter(t => t.id !== trackId);
                     setTrackQueue(nextQueue);
                     setQueue(nextQueue);
                     trackQueueRef.current = nextQueue;

                     if (nextQueue.length > 0) {
                         const nextIndex = Math.min(currentIndex, nextQueue.length - 1);
                         if (nextQueue[nextIndex]) {
                             playTrack(nextQueue[nextIndex]);
                         } else {
                             setCurrentIndex(0);
                         }
                     } else {
                         setCurrentIndex(0);
                     }
                 } else {
                     // If not the current track (or user is owner), just remove from queues if not owner
                     const nextQueue = queue.filter(t => t.id !== trackId || t.artistId === currentArtistId);
                     const nextPlaybackQueue = trackQueue.filter(t => t.id !== trackId || t.artistId === currentArtistId);
                     
                     if (nextQueue.length !== queue.length) { // Check if filter actually removed something
                        console.log('[WebSocket] Hidden track removed from queues (user not owner)');
                        setQueue(nextQueue);
                        setTrackQueue(nextPlaybackQueue);
                        trackQueueRef.current = nextPlaybackQueue;
                        // Adjust currentIndex if needed
                         const hiddenIndex = trackQueue.findIndex(t => t.id === trackId);
                        if (hiddenIndex !== -1 && hiddenIndex < currentIndex) {
                            setCurrentIndex(prev => Math.max(0, prev - 1));
                        }
                     }
                 }
           } else {
                // Track became active, update isActive status if it exists in the state
                 setCurrentTrack(prevTrack => 
                    prevTrack?.id === trackId ? { ...prevTrack, isActive: true } : prevTrack
                 );
                setQueue(prevQueue => 
                    prevQueue.map(t => t.id === trackId ? { ...t, isActive: true } : t)
                );
                setTrackQueue(prevPlaybackQueue => 
                    prevPlaybackQueue.map(t => t.id === trackId ? { ...t, isActive: true } : t)
                );
           }
        });
     // Only apply delay in development
    }, process.env.NODE_ENV === 'development' ? 100 : 0);

    // Cleanup
    return () => {
      clearTimeout(connectTimer); // Clear the timer if component unmounts before connection
      if (socket) {
          console.log(`[WebSocket] TrackContext disconnecting...`);
          socket.off('connect');
          socket.off('disconnect');
          socket.off('connect_error');
          socket.off('track:updated');
          socket.off('track:deleted');
          socket.off('track:visibilityChanged');
          socket.disconnect();
      }
    };
  }, [currentTrack?.id, currentIndex, queue, trackQueue, setCurrentTrack, setQueue, setTrackQueue, setIsPlaying, setCurrentIndex, playTrack, pauseTrack, skipNext]);

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
