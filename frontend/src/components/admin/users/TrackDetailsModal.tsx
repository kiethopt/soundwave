"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Track } from "@/types";
import { api } from "@/utils/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

// Extend Track type to include the detailed audio features
interface TrackWithAudioFeatures extends Track {
  tempo?: number | null;
  mood?: string | null;
  key?: string | null;
  scale?: string | null;
  danceability?: number | null;
  energy?: number | null;
}

interface TrackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: TrackWithAudioFeatures | null;
  onSuccessfulReanalyze?: (trackId: string) => void;
}

const DetailItem: React.FC<{
  label: string;
  value: string | number | null | undefined;
}> = ({ label, value }) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-border/50 last:border-b-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}:</dt>
      <dd className="text-sm">{String(value)}</dd>
    </div>
  );
};

export const TrackDetailsModal: React.FC<TrackDetailsModalProps> = ({
  isOpen,
  onClose,
  track,
  onSuccessfulReanalyze,
}) => {
  const [loadingReanalyze, setLoadingReanalyze] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] =
    useState<TrackWithAudioFeatures | null>(track);

  React.useEffect(() => {
    setCurrentTrack(track);
  }, [track]);

  const handleReanalyze = useCallback(async () => {
    if (!currentTrack?.id) {
      toast.error("Track ID is missing. Cannot re-analyze.");
      return;
    }

    setLoadingReanalyze(true);
    setReanalyzeError(null);
    const toastId = toast.loading("Re-analyzing audio features...");

    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const result = await api.admin.reanalyzeTrack(currentTrack.id, token);

      toast.success(result.message || "Track re-analyzed successfully!", {
        id: toastId,
      });

      if (result.track) {
        const updatedTrackData: TrackWithAudioFeatures = {
          ...currentTrack,
          id: result.track.id || currentTrack.id,
          title: result.track.title || currentTrack.title,
          duration:
            result.track.duration !== undefined
              ? result.track.duration
              : currentTrack.duration,
          coverUrl:
            result.track.coverUrl !== undefined
              ? result.track.coverUrl
              : currentTrack.coverUrl,
          artistId:
            result.track.artistId !== undefined
              ? result.track.artistId
              : currentTrack.artistId,
          albumId:
            result.track.albumId !== undefined
              ? result.track.albumId
              : currentTrack.albumId,
          genres:
            result.track.genres !== undefined
              ? result.track.genres
              : currentTrack.genres,
          playCount:
            result.track.playCount !== undefined
              ? result.track.playCount
              : currentTrack.playCount,
          artist:
            result.track.artist !== undefined
              ? result.track.artist
              : currentTrack.artist,
          album:
            result.track.album !== undefined
              ? result.track.album
              : currentTrack.album,
          tempo: result.track.tempo,
          mood: result.track.mood,
          key: result.track.key,
          scale: result.track.scale,
          danceability: result.track.danceability,
          energy: result.track.energy,
          createdAt: result.track.createdAt || currentTrack.createdAt,
          updatedAt: result.track.updatedAt || currentTrack.updatedAt,
          releaseDate:
            result.track.releaseDate !== undefined
              ? result.track.releaseDate
              : currentTrack.releaseDate,
        };
        setCurrentTrack(updatedTrackData);
      }

      if (onSuccessfulReanalyze) {
        onSuccessfulReanalyze(currentTrack.id);
      }
    } catch (error: any) {
      console.error("Error re-analyzing track:", error);
      const errorMessage = error.message || "Failed to re-analyze track.";
      setReanalyzeError(errorMessage);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoadingReanalyze(false);
    }
  }, [currentTrack, onClose, onSuccessfulReanalyze]);

  if (!currentTrack) {
    return null;
  }

  const hasMissingFeatures =
    !currentTrack.tempo ||
    !currentTrack.mood ||
    !currentTrack.key ||
    !currentTrack.scale ||
    currentTrack.danceability === null ||
    currentTrack.danceability === undefined ||
    currentTrack.energy === null ||
    currentTrack.energy === undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Track Audio Features</DialogTitle>
          <DialogDescription>
            Detailed audio analysis parameters for "
            <strong>{currentTrack.title || "Unknown Track"}</strong>".
            {hasMissingFeatures && (
              <span className="block text-xs text-amber-600 dark:text-amber-500 mt-1">
                Some audio features are missing. You can try re-analyzing.
              </span>
            )}
            {reanalyzeError && (
              <span className="block text-xs text-red-600 dark:text-red-500 mt-1">
                Re-analysis failed: {reanalyzeError}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <dl className="space-y-0">
            <DetailItem label="Title" value={currentTrack.title} />
            <DetailItem
              label="Artist"
              value={currentTrack.artist?.artistName}
            />
            <DetailItem
              label="Tempo"
              value={
                currentTrack.tempo
                  ? `${Math.round(currentTrack.tempo)} BPM`
                  : "N/A"
              }
            />
            <DetailItem label="Mood" value={currentTrack.mood || "N/A"} />
            <DetailItem
              label="Key"
              value={
                currentTrack.key && currentTrack.scale
                  ? `${currentTrack.key} ${currentTrack.scale}`
                  : "N/A"
              }
            />
            <DetailItem
              label="Danceability"
              value={
                currentTrack.danceability !== null &&
                currentTrack.danceability !== undefined
                  ? (currentTrack.danceability * 100).toFixed(0) + "%"
                  : "N/A"
              }
            />
            <DetailItem
              label="Energy"
              value={
                currentTrack.energy !== null &&
                currentTrack.energy !== undefined
                  ? (currentTrack.energy * 100).toFixed(0) + "%"
                  : "N/A"
              }
            />
          </dl>
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button
            onClick={handleReanalyze}
            disabled={loadingReanalyze}
            variant={hasMissingFeatures ? "default" : "secondary"}
          >
            {loadingReanalyze && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Re-analyze Audio
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loadingReanalyze}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
