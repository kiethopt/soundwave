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
  const [queueType, setQueueType] = useState<string>("track");
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackQueueRef = useRef<Track[]>([]);
  const tabId = useRef(Math.random().toString(36).substring(2, 15)).current;
  const broadcastChannel = useRef<BroadcastChannel | null>(null);

  // Initialize audio and broadcast channel
  useEffect(() => {
    audioRef.current = new Audio();
    broadcastChannel.current = new BroadcastChannel("musicPlayback");
    const token = localStorage.getItem("userToken");
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
        console.error("Failed to save play history:", error);
      }
    },
    [token]
  );

  const playTrack = useCallback(
    async (track: Track) => {
      if (!track.audioUrl) {
        console.error("Audio URL is missing for this track.");
        return;
      }

      if (!audioRef.current) return;

      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({ type: "play", tabId });
      }

      setShowPlayer(true);

      if (currentTrack?.id === track.id) {
        audioRef.current.play().catch((error) => {
          console.error("Playback error:", error);
          setIsPlaying(false);
        });
        setIsPlaying(true);
        return;
      }

      setPlayStartTime(Date.now());
      setLastSavedTime(0);
      audioRef.current.src = track.audioUrl;
      audioRef.current.currentTime = 0;
      setProgress(0);

      const newIndex = trackQueueRef.current.findIndex(
        (t) => t.id === track.id
      );
      if (newIndex !== -1) {
        setCurrentIndex(newIndex);
      }

      setCurrentTrack(track);
      setIsPlaying(true);

      try {
        await audioRef.current.play();
        saveHistory(track.id, 0, false).catch((error) => {
          console.error("Failed to save initial play history:", error);
        });
      } catch (error) {
        console.error("Playback error:", error);
        setIsPlaying(false);
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

  // Main audio event listeners and tab synchronization
  useEffect(() => {
    if (!audioRef.current || !broadcastChannel.current) return;

    const audio = audioRef.current;
    audio.volume = volume;
    audio.loop = loop;

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
        audio.currentTime = 0;
        audio
          .play()
          .catch((error) =>
            console.error("Error playing track after loop:", error)
          );
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
        // If another tab has started playback, pause the current tab
        pauseTrack();
      }
    };

    // Add event listeners
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

    // Cleanup event listeners
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
    lastSavedTime,
    saveHistory,
    pauseTrack,
    tabId,
  ]);

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
        setQueueType,
        skipRandom,
        seekTrack,
        toggleLoop,
        toggleShuffle,
        skipNext,
        skipPrevious,
        showPlayer,
        togglePlayPause: pauseTrack,
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
