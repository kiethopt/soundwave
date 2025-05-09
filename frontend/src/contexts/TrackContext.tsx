"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Track } from "@/types";
import { api } from "@/utils/api";
import { toast } from "react-hot-toast";

// Helper function to get initial volume from localStorage
const getInitialVolume = (): number => {
  if (typeof window === "undefined") return 1;

  const savedVolume = localStorage.getItem("userVolume");
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
  queueSourceId: string | null;
  setQueueSourceId: (id: string | null) => void;
}

export const TrackContext = createContext<TrackContextType>({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  progress: 0,
  loop: false,
  shuffle: false,
  duration: 0,
  queueType: "track",
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
  queueSourceId: null,
  setQueueSourceId: () => {},
});

export const TrackProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(getInitialVolume());
  const [loop, setLoop] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [shuffle, setShuffle] = useState(false);
  const [trackQueue, setTrackQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [queueType, setQueueType] = useState<string>("track");
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueSourceId, setQueueSourceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackQueueRef = useRef<Track[]>([]);
  const tabId = useRef(Math.random().toString(36).substring(2, 15)).current;
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  const currentPlayRequestRef = useRef<AbortController | null>(null);

  // Initialize audio and broadcast channel
  useEffect(() => {
    audioRef.current = new Audio();
    broadcastChannel.current = new BroadcastChannel("musicPlayback");
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
      const currentToken = localStorage.getItem("userToken");
      if (!currentToken) return;

      try {
        await api.history.savePlay(currentToken, {
          trackId,
          duration,
          completed,
        });
      } catch (error) {
        // console.error("Failed to save play history:", error); // Removed unused variable 'e'
        // Do not show toast here, as it can be annoying for a background task
      }
    },
    []
  );

  // Add function to reorganize queue when a track is selected
  const reorderQueueFromSelected = useCallback(
    (tracks: Track[], selectedIndex: number) => {
      if (selectedIndex < 0 || selectedIndex >= tracks.length) return tracks;

      // Split the array at the selected index
      const firstPart = tracks.slice(0, selectedIndex);
      const secondPart = tracks.slice(selectedIndex);

      // Combine the arrays so selected track comes first, followed by the rest in order
      return [...secondPart, ...firstPart];
    },
    []
  );

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

        if (trackIndex !== -1) {
          // Nếu track đã có trong queue, chỉ set currentIndex, KHÔNG reorder queue
          setCurrentIndex(trackIndex);
        } else {
          // Nếu track chưa có trong queue, thêm vào queue và play
          const newQueue = [...trackQueueRef.current, track];
          setTrackQueue(newQueue);
          trackQueueRef.current = newQueue;
          setQueue(newQueue);
          setCurrentIndex(newQueue.length - 1);
        }

        if (!trackToPlay.audioUrl) {
          console.log(
            `Audio URL missing for ${track.title}, fetching details...`
          );
          const currentToken = localStorage.getItem("userToken");
          if (!currentToken) {
            console.error(
              "Authentication token not found, cannot fetch track details."
            );
            setIsPlaying(false);
            return;
          }
          const trackDetailResponse = await api.tracks.getById(
            track.id,
            currentToken
          );
          if (signal.aborted) {
            console.log("Track fetch aborted.");
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
          broadcastChannel.current.postMessage({ type: "play", tabId });
        }

        setShowPlayer(true);

        if (currentTrack?.id === trackToPlay.id) {
          if (audioRef.current.paused) {
            try {
              await audioRef.current.play();
              setIsPlaying(true);
            } catch (error) {
              if (error instanceof Error && error.name !== "AbortError") {
                console.error("Resume playback error:", error);
                setIsPlaying(false);
              }
            }
          } else {
            audioRef.current.currentTime = 0;
            try {
              await audioRef.current.play();
              setIsPlaying(true);
            } catch (error) {
              if (error instanceof Error && error.name !== "AbortError") {
                console.error("Resume playback error:", error);
                setIsPlaying(false);
              }
            }
          }
          return;
        }

        setPlayStartTime(Date.now());
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
            audioRef.current?.removeEventListener("canplay", handleCanPlay);
            audioRef.current?.removeEventListener("error", handleError);
            const audioDuration = audioRef.current?.duration;
            if (audioDuration && !isNaN(audioDuration)) {
              setDuration(audioDuration);
            } else {
              setDuration(0);
            }
            resolve();
          };

          const handleError = (e: Event) => {
            audioRef.current?.removeEventListener("canplay", handleCanPlay);
            audioRef.current?.removeEventListener("error", handleError);
            console.error("Audio playback error:", audioRef.current?.error);
            reject(
              new Error(
                `Failed to load audio: ${
                  audioRef.current?.error?.message || "Unknown error"
                }`
              )
            );
          };

          audioRef.current?.addEventListener("canplay", handleCanPlay);
          audioRef.current?.addEventListener("error", handleError);

          if (
            audioRef.current?.readyState &&
            audioRef.current.readyState >= 3
          ) {
            handleCanPlay();
          }

          const timeoutId = setTimeout(() => {
            audioRef.current?.removeEventListener("canplay", handleCanPlay);
            audioRef.current?.removeEventListener("error", handleError);
            reject(new Error("Audio load timed out after 15 seconds"));
          }, 15000);

          const clearAudioTimeout = () => clearTimeout(timeoutId);
          audioRef.current?.addEventListener("canplay", clearAudioTimeout, {
            once: true,
          });
          audioRef.current?.addEventListener("error", clearAudioTimeout, {
            once: true,
          });
        });

        if (signal.aborted) {
          console.log("Playback aborted while waiting for audio to load.");
          setIsPlaying(false);
          return;
        }

        await audioRef.current.play();
        setIsPlaying(true);

        // Call backend API to record the play event
        const currentToken = localStorage.getItem("userToken");
        if (currentToken) {
          try {
            console.log(
              `[TrackContext DEBUG] Attempting to call api.tracks.recordPlay for track: ${trackToPlay.id}, Title: ${trackToPlay.title}, Artist: ${trackToPlay.artist?.artistName ?? 'N/A'}`
            );
            // Use trackToPlay.id which has the potentially fetched data
            await api.tracks.recordPlay(trackToPlay.id, currentToken);
            console.log(
              `[TrackContext] Successfully notified backend about playing track: ${trackToPlay.id}`
            );
          } catch (apiError) {
            console.error(
              `[TrackContext] Failed to notify backend about playing track ${trackToPlay.id}:`,
              apiError
            );
            // Decide how to handle this error - maybe log or show a subtle indicator
          }
        } else {
          console.warn(
            "[TrackContext] No token found, skipping backend play notification."
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in playTrack:", error);
          setIsPlaying(false);
          setCurrentTrack(null);
        } else if (error instanceof Error && error.name === "AbortError") {
          console.log("playTrack aborted.");
        }
      } finally {
        if (currentPlayRequestRef.current?.signal === signal) {
          currentPlayRequestRef.current = null;
        }
      }
    },
    [
      currentTrack,
      isPlaying,
      saveHistory,
      tabId,
      trackQueueRef,
      reorderQueueFromSelected,
    ]
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
      localStorage.setItem("userVolume", newVolume.toString());
    } catch (error) {
      console.error("Failed to save volume to localStorage:", error);
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
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error skipping to previous track:", error);
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
      if (event.data.type === "play" && event.data.tabId !== tabId) {
        // Nếu tab khác đã bắt đầu phát, tạm dừng tab hiện tại
        pauseTrack();
      }
    };

    audio.addEventListener("loadedmetadata", handleMetadataLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    broadcastChannel.current.addEventListener(
      "message",
      handleBroadcastMessage
    );

    const handleBeforeUnload = () => {
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({ type: "stop", tabId });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      audio.removeEventListener("loadedmetadata", handleMetadataLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      if (broadcastChannel.current) {
        broadcastChannel.current.removeEventListener(
          "message",
          handleBroadcastMessage
        );
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    loop,
    volume,
    skipNext,
    skipRandom,
    currentTrack,
    playStartTime,
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
  const addToQueue = useCallback(
    (track: Track) => {
      setQueue((prevQueue) => {
        const isTrackInQueue = prevQueue.some((item) => item.id === track.id);

        // Nếu queue rỗng, thêm và play luôn
        if (prevQueue.length === 0) {
          setTrackQueue([track]);
          trackQueueRef.current = [track];
          playTrack(track);
          return [track];
        }

        // Nếu chưa có trong queue, thêm vào cuối
        if (!isTrackInQueue) {
          const newQueue = [...prevQueue, track];
          return newQueue;
        }

        return prevQueue;
      });
    },
    [playTrack]
  );

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
    // let socket: Socket | null = null;
    // const connectSocket = () => {
    //   socket = io(process.env.NEXT_PUBLIC_API_URL!);
    //   console.log('[WebSocket] Attempting TrackContext connection...');
    //   // --- Event Listeners ---
    //   socket.on('connect', () => {
    //     console.log(`[WebSocket] TrackContext connected`);
    //   });
    //   socket.on('disconnect', (reason: string) => {
    //     console.log(`[WebSocket] TrackContext disconnected:`, reason);
    //   });
    //   socket.on('connect_error', (error: Error) => {
    //       console.error(`[WebSocket] TrackContext Connection Error:`, error);
    //   });
    //   socket.on('track:updated', (data: { track: Track }) => {
    //     const updatedTrack = data.track;
    //     console.log('[WebSocket] TrackContext received track:updated', updatedTrack);
    //     setCurrentTrack(prevTrack =>
    //       prevTrack?.id === updatedTrack.id ? { ...prevTrack, ...updatedTrack } : prevTrack
    //     );
    //     setQueue(prevQueue =>
    //       prevQueue.map(t => t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t)
    //     );
    //      setTrackQueue(prevPlaybackQueue =>
    //       prevPlaybackQueue.map(t => t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t)
    //     );
    //   });
    //   socket.on('track:deleted', (data: { trackId: string }) => {
    //     const deletedTrackId = data.trackId;
    //     console.log('[WebSocket] TrackContext received track:deleted', deletedTrackId);
    //     if (currentTrack?.id === deletedTrackId) {
    //       console.log('[WebSocket] Current track deleted, skipping next...');
    //        if (audioRef.current) {
    //           audioRef.current.pause();
    //           audioRef.current.src = '';
    //        }
    //        setCurrentTrack(null);
    //        setIsPlaying(false);
    //        const nextQueue = trackQueueRef.current.filter(t => t.id !== deletedTrackId);
    //        setTrackQueue(nextQueue);
    //        setQueue(nextQueue);
    //        trackQueueRef.current = nextQueue;
    //        if (nextQueue.length > 0) {
    //           const nextIndex = Math.min(currentIndex, nextQueue.length - 1);
    //            if (nextQueue[nextIndex]) {
    //                playTrack(nextQueue[nextIndex]);
    //            } else {
    //                setCurrentIndex(0);
    //            }
    //        } else {
    //           setCurrentIndex(0);
    //        }
    //     } else {
    //         const nextQueue = queue.filter(t => t.id !== deletedTrackId);
    //         const nextPlaybackQueue = trackQueue.filter(t => t.id !== deletedTrackId);
    //         setQueue(nextQueue);
    //         setTrackQueue(nextPlaybackQueue);
    //         trackQueueRef.current = nextPlaybackQueue;
    //          const deletedIndex = trackQueue.findIndex(t => t.id === deletedTrackId);
    //         if (deletedIndex !== -1 && deletedIndex < currentIndex) {
    //             setCurrentIndex(prev => Math.max(0, prev - 1));
    //         }
    //     }
    //   });
    //   socket.on('track:visibilityChanged', (data: { trackId: string; isActive: boolean }) => {
    //     const { trackId, isActive } = data;
    //     console.log(`[WebSocket] TrackContext received track:visibilityChanged for ${trackId}: ${isActive}`);
    //      if (!isActive) {
    //           let currentArtistId: string | null = null;
    //           try {
    //               const userDataString = localStorage.getItem('userData');
    //               if (userDataString) {
    //                   const userData = JSON.parse(userDataString);
    //                   currentArtistId = userData?.artistProfile?.id || null;
    //               }
    //           } catch (e) {
    //               console.error("Error parsing user data for visibility check:", e);
    //           }
    //            if (currentTrack?.id === trackId && currentTrack.artistId !== currentArtistId) {
    //               console.log('[WebSocket] Current track hidden and user is not owner, skipping next...');
    //                if (audioRef.current) {
    //                   audioRef.current.pause();
    //                   audioRef.current.src = '';
    //                }
    //                setCurrentTrack(null);
    //                setIsPlaying(false);
    //                const nextQueue = trackQueueRef.current.filter(t => t.id !== trackId);
    //                setTrackQueue(nextQueue);
    //                setQueue(nextQueue);
    //                trackQueueRef.current = nextQueue;
    //                if (nextQueue.length > 0) {
    //                    const nextIndex = Math.min(currentIndex, nextQueue.length - 1);
    //                    if (nextQueue[nextIndex]) {
    //                        playTrack(nextQueue[nextIndex]);
    //                    } else {
    //                        setCurrentIndex(0);
    //                    }
    //                } else {
    //                    setCurrentIndex(0);
    //                }
    //            } else {
    //                const nextQueue = queue.filter(t => t.id !== trackId || t.artistId === currentArtistId);
    //                const nextPlaybackQueue = trackQueue.filter(t => t.id !== trackId || t.artistId === currentArtistId);
    //                if (nextQueue.length !== queue.length) {
    //                   console.log('[WebSocket] Hidden track removed from queues (user not owner)');
    //                   setQueue(nextQueue);
    //                   setTrackQueue(nextPlaybackQueue);
    //                   trackQueueRef.current = nextPlaybackQueue;
    //                    const hiddenIndex = trackQueue.findIndex(t => t.id === trackId);
    //                   if (hiddenIndex !== -1 && hiddenIndex < currentIndex) {
    //                       setCurrentIndex(prev => Math.max(0, prev - 1));
    //                   }
    //                }
    //            }
    //      } else {
    //            setCurrentTrack(prevTrack =>
    //               prevTrack?.id === trackId ? { ...prevTrack, isActive: true } : prevTrack
    //            );
    //           setQueue(prevQueue =>
    //               prevQueue.map(t => t.id === trackId ? { ...t, isActive: true } : t)
    //           );
    //           setTrackQueue(prevPlaybackQueue =>
    //               prevPlaybackQueue.map(t => t.id === trackId ? { ...t, isActive: true } : t)
    //           );
    //      }
    //   });
    // };
    // const timeoutId = setTimeout(connectSocket, process.env.NODE_ENV === 'development' ? 100 : 0);
    // return () => {
    //   clearTimeout(timeoutId);
    //   if (socket) {
    //       console.log(`[WebSocket] TrackContext disconnecting...`);
    //       socket.off('connect');
    //       socket.off('disconnect');
    //       socket.off('connect_error');
    //       socket.off('track:updated');
    //       socket.off('track:deleted');
    //       socket.off('track:visibilityChanged');
    //       socket.disconnect();
    //   }
    // };
  }, [
    currentTrack?.id,
    currentIndex,
    queue,
    trackQueue,
    setCurrentTrack,
    setQueue,
    setTrackQueue,
    setIsPlaying,
    setCurrentIndex,
    playTrack,
    pauseTrack,
    skipNext,
  ]); // Consider which dependencies are truly needed if socket logic is removed

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
        queueSourceId,
        setQueueSourceId,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
};

export const useTrack = () => {
  const context = useContext(TrackContext);
  if (context === undefined) {
    throw new Error("useTrack must be used within a TrackProvider");
  }
  return context;
};
