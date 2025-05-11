"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Track, ArtistProfile, Genre } from "@/types";
import { Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/utils/api";
import {
  ConfirmActionModal,
  DefaultDeleteIcon,
} from "@/components/Modal/ConfirmActionModal";

interface PreviewTrack extends Pick<Track, "id" | "title" | "coverUrl"> {
  duration?: number | null;
  artist: Pick<ArtistProfile, "artistName"> | null;
  album?: { title?: string } | null;
  genres?: { genre: Pick<Genre, "name"> }[];
  addedAt?: string;
}

interface PreviewPlaylist {
  id: string;
  name: string;
  description?: string | null;
  tracks: { track: PreviewTrack; addedAt?: string }[];
}

interface PlaylistPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PreviewPlaylist | null;
  theme?: "light" | "dark";
  onRefreshAndClose: () => void;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  actionType: "deleteTrack" | "deletePlaylist" | null;
  itemId?: string | null;
}

const initialConfirmModalState: ConfirmModalState = {
  isOpen: false,
  title: "",
  message: "",
  onConfirm: () => {},
  actionType: null,
  itemId: null,
};

const formatTrackDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || isNaN(seconds))
    return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const PlaylistPreviewModal: React.FC<PlaylistPreviewModalProps> = ({
  isOpen,
  onClose,
  playlist,
  theme,
  onRefreshAndClose,
}) => {
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>(
    initialConfirmModalState
  );

  if (!playlist) {
    return null;
  }

  const hasValidTracks =
    playlist.tracks &&
    Array.isArray(playlist.tracks) &&
    playlist.tracks.length > 0;

  const executeDeleteTrack = async (trackId: string) => {
    if (!playlist) return;
    setDeletingTrackId(trackId);
    const toastId = toast.loading("Removing track...");
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("Authentication token not found.");

      await api.admin.removeTrackFromSystemPlaylist(
        playlist.id,
        trackId,
        token
      );
      toast.success("Track removed successfully.", { id: toastId });
      setConfirmModalState(initialConfirmModalState);
      onRefreshAndClose();
    } catch (error: any) {
      console.error("Failed to remove track:", error);
      toast.error(error.message || "Failed to remove track.", { id: toastId });
    } finally {
      setDeletingTrackId(null);
    }
  };

  const handleDeleteTrack = (trackId: string, trackTitle?: string) => {
    setConfirmModalState({
      isOpen: true,
      title: "Remove Track",
      message: (
        <>
          Are you sure you want to remove the track "
          <b>{trackTitle || "this track"}</b>" from this playlist?
        </>
      ),
      onConfirm: () => executeDeleteTrack(trackId),
      actionType: "deleteTrack",
      itemId: trackId,
    });
  };

  const executeDeletePlaylist = async () => {
    if (!playlist) return;
    setDeletingPlaylist(true);
    const toastId = toast.loading("Deleting playlist...");
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("Authentication token not found.");
      await api.admin.deleteSystemPlaylist(playlist.id, token);
      toast.success("Playlist deleted successfully.", { id: toastId });
      setConfirmModalState(initialConfirmModalState);
      onRefreshAndClose();
    } catch (error: any) {
      console.error("Failed to delete playlist:", error);
      toast.error(error.message || "Failed to delete playlist.", {
        id: toastId,
      });
    } finally {
      setDeletingPlaylist(false);
    }
  };

  const handleDeletePlaylist = () => {
    if (!playlist) return;
    setConfirmModalState({
      isOpen: true,
      title: "Delete Playlist",
      message: (
        <>
          Are you sure you want to delete the playlist "<b>{playlist.name}</b>"?
          This action cannot be undone.
        </>
      ),
      onConfirm: executeDeletePlaylist,
      actionType: "deletePlaylist",
      itemId: playlist.id,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModalState(initialConfirmModalState);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl ${
            theme === "dark" ? "dark bg-zinc-900 border-zinc-700" : "bg-white"
          }`}
        >
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-semibold text-primary">
              {playlist.name || "Untitled Playlist"}
            </DialogTitle>
            {playlist.description && (
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                {playlist.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {hasValidTracks ? (
            <ScrollArea className="max-h-[60vh] md:max-h-[70vh] pr-2">
              <Table
                className={theme === "dark" ? "text-gray-300" : "text-gray-700"}
              >
                <TableHeader>
                  <TableRow
                    className={
                      theme === "dark" ? "border-zinc-700" : "border-gray-300"
                    }
                  >
                    <TableHead className="w-[50px] text-center">#</TableHead>
                    <TableHead className="w-[80px]">Cover</TableHead>
                    <TableHead>Title & Artist</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Album
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Genres
                    </TableHead>
                    <TableHead className="text-right hidden sm:table-cell w-[100px]">
                      Duration
                    </TableHead>
                    <TableHead className="text-center w-[80px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  className={
                    theme === "dark" ? "border-zinc-800" : "border-gray-200"
                  }
                >
                  {playlist.tracks.map(({ track, addedAt }, index) => {
                    if (!track || !track.id) return null;
                    const isCurrentlyDeleting =
                      deletingTrackId === track.id &&
                      confirmModalState.actionType === "deleteTrack";
                    return (
                      <TableRow
                        key={track.id}
                        className={`hover:bg-opacity-50 ${
                          theme === "dark"
                            ? "border-zinc-800 hover:bg-zinc-800"
                            : "border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {track.coverUrl ? (
                            <Image
                              src={track.coverUrl}
                              alt={track.title || "Track cover"}
                              width={40}
                              height={40}
                              className="rounded object-cover aspect-square"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/images/default-track.jpg";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs overflow-hidden">
                              <img
                                src="/images/default-track.jpg"
                                alt="Default cover"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-primary truncate">
                            {track.title || "Unknown Title"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {track.artist?.artistName || "Unknown Artist"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate">
                          {track.album?.title || "N/A"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate">
                          {track.genres &&
                          Array.isArray(track.genres) &&
                          track.genres.length > 0
                            ? track.genres
                                .map((g) =>
                                  g && g.genre ? g.genre.name : null
                                )
                                .filter((name) => name !== null)
                                .join(", ") || "N/A"
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
                          {formatTrackDuration(track.duration)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDeleteTrack(track.id, track.title)
                            }
                            disabled={
                              deletingPlaylist || deletingTrackId === track.id
                            }
                            className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive/80"
                            title="Remove track"
                          >
                            {deletingTrackId === track.id &&
                            confirmModalState.actionType !==
                              "deletePlaylist" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">
                This playlist currently has no tracks.
              </p>
            </div>
          )}

          <DialogFooter className="pt-6 flex flex-row justify-between items-center">
            <Button
              variant="destructive"
              onClick={handleDeletePlaylist}
              disabled={deletingPlaylist || !!deletingTrackId}
              className="mr-auto"
            >
              {deletingPlaylist &&
              confirmModalState.actionType !== "deleteTrack" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Entire Playlist
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={deletingPlaylist || !!deletingTrackId}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        isOpen={confirmModalState.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isLoading={
          confirmModalState.actionType === "deleteTrack"
            ? !!deletingTrackId
            : deletingPlaylist
        }
        icon={<DefaultDeleteIcon />}
        confirmButtonText={
          confirmModalState.actionType === "deletePlaylist"
            ? "Delete Playlist"
            : "Remove Track"
        }
      />
    </>
  );
};
