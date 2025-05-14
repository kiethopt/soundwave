"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Loader2, Trash2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/utils/api";
import {
  ConfirmActionModal,
  DefaultDeleteIcon,
} from "@/components/Modal/ConfirmActionModal";
import { Checkbox } from "@/components/ui/checkbox";

interface PreviewTrack extends Pick<Track, "id" | "title" | "coverUrl"> {
  duration?: number | null;
  artistName?: string | null;
  albumTitle?: string | null;
  genres?: string[];
  addedAt?: string;
}

interface FullPlaylistDetails {
  id: string;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  privacy?: string;
  type?: string;
  totalTracks?: number;
  tracks: {
    id: string;
    addedAt: string;
    trackOrder: number;
    track: PreviewTrack;
  }[];
}

interface PlaylistPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: { id: string; name: string; description?: string | null } | null;
  theme?: "light" | "dark";
  onRefreshAndClose: () => void;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  actionType: "deleteTrack" | "bulkDeleteTracks" | null;
  itemId?: string | null;
  itemIds?: string[];
}

const initialConfirmModalState: ConfirmModalState = {
  isOpen: false,
  title: "",
  message: "",
  onConfirm: () => {},
  actionType: null,
  itemId: null,
  itemIds: [],
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
  playlist: initialPlaylistData,
  theme,
  onRefreshAndClose,
}) => {
  const [detailedPlaylist, setDetailedPlaylist] =
    useState<FullPlaylistDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(
    new Set()
  );

  console.log(
    "[PlaylistPreviewModal] Received initial playlist prop:",
    initialPlaylistData
  );

  useEffect(() => {
    if (isOpen && initialPlaylistData?.id) {
      const fetchDetails = async () => {
        console.log(
          `[PlaylistPreviewModal] Fetching details for playlist ID: ${initialPlaylistData.id}`
        );
        setIsLoadingDetails(true);
        setDetailError(null);
        setDetailedPlaylist(null);
        setSelectedTrackIds(new Set());
        try {
          const token = localStorage.getItem("userToken");
          if (!token) throw new Error("Authentication token not found.");
          const response = await api.admin.getSystemPlaylistDetails(
            initialPlaylistData.id,
            token
          );
          if (response.success && response.data) {
            console.log(
              "[PlaylistPreviewModal] Fetched full playlist details:",
              response.data
            );
            setDetailedPlaylist(response.data);
          } else {
            throw new Error(
              response.message || "Failed to load playlist details"
            );
          }
        } catch (error: any) {
          console.error("Error fetching playlist details:", error);
          setDetailError(error.message || "Could not load playlist details.");
          toast.error(error.message || "Could not load playlist details.");
        } finally {
          setIsLoadingDetails(false);
        }
      };
      fetchDetails();
    } else if (!isOpen) {
      setDetailedPlaylist(null);
      setIsLoadingDetails(false);
      setDetailError(null);
      setSelectedTrackIds(new Set());
    }
  }, [isOpen, initialPlaylistData?.id]);

  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [isBulkDeletingTracks, setIsBulkDeletingTracks] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>(
    initialConfirmModalState
  );

  const displayPlaylistName =
    detailedPlaylist?.name || initialPlaylistData?.name || "Untitled Playlist";
  const displayPlaylistDescription =
    detailedPlaylist?.description || initialPlaylistData?.description;

  if (!isOpen) {
    return null;
  }

  const currentTracks = detailedPlaylist?.tracks || [];

  const hasValidTracks =
    currentTracks && Array.isArray(currentTracks) && currentTracks.length > 0;

  const getSelectAllTracksState = () => {
    if (!hasValidTracks || currentTracks.length === 0) return false;
    const allTrackActualIds = currentTracks.map((pt) => pt.track.id);
    if (selectedTrackIds.size === allTrackActualIds.length) return true;
    if (selectedTrackIds.size > 0) return "indeterminate";
    return false;
  };

  const handleSelectAllTracks = (checked: boolean | "indeterminate") => {
    if (!hasValidTracks) return;
    const allTrackActualIds = currentTracks.map((pt) => pt.track.id);
    if (checked === true) {
      setSelectedTrackIds(new Set(allTrackActualIds));
    } else {
      setSelectedTrackIds(new Set());
    }
  };

  const handleSelectTrackRow = (
    trackActualId: string,
    checked: boolean | "indeterminate"
  ) => {
    setSelectedTrackIds((prev) => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(trackActualId);
      } else {
        newSet.delete(trackActualId);
      }
      return newSet;
    });
  };

  const executeDeleteTrack = async (trackId: string) => {
    if (!detailedPlaylist) return;
    setDeletingTrackId(trackId);
    const toastId = toast.loading("Removing track...");
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("Authentication token not found.");

      await api.admin.removeTrackFromSystemPlaylist(
        detailedPlaylist.id,
        trackId,
        token
      );
      toast.success("Track removed successfully.", { id: toastId });
      setConfirmModalState(initialConfirmModalState);
      setSelectedTrackIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });
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

  const closeConfirmModal = () => {
    setConfirmModalState(initialConfirmModalState);
  };

  // Hàm thực thi xóa nhiều track
  const executeBulkDeleteTracks = async () => {
    if (!detailedPlaylist || selectedTrackIds.size === 0) {
      // This case should ideally be prevented by disabling the button
      toast.error("No tracks selected for deletion.");
      return;
    }

    const tracksToDelete = Array.from(selectedTrackIds);
    const playlistId = detailedPlaylist.id;
    const initialTrackCountInModal = detailedPlaylist.tracks.length;
    const currentPlaylistName = displayPlaylistName; // Capture name before it might get cleared

    setIsBulkDeletingTracks(true);
    const toastId = toast.loading(
      `Removing ${tracksToDelete.length} track(s)...`
    );

    let successCount = 0;
    let failCount = 0;
    let token: string | null = null;

    try {
      token = localStorage.getItem("userToken");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      for (const trackId of tracksToDelete) {
        try {
          await api.admin.removeTrackFromSystemPlaylist(
            playlistId,
            trackId,
            token
          );
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to remove track ${trackId}:`, error);
        }
      }

      // All track removal attempts are done. Now, evaluate results.
      const allSelectedTracksWereSuccessfullyRemoved =
        successCount === tracksToDelete.length && failCount === 0;
      const allTracksInModalWereSelectedAndRemoved =
        allSelectedTracksWereSuccessfullyRemoved &&
        tracksToDelete.length === initialTrackCountInModal;

      if (allTracksInModalWereSelectedAndRemoved) {
        // Playlist became empty as a result of these deletions. Attempt to auto-delete it.
        try {
          await api.admin.deleteSystemPlaylist(playlistId, token);
          toast.success(
            `Playlist "${currentPlaylistName}" was automatically deleted as it became empty.`,
            { id: toastId, duration: 5000 }
          );
          // setConfirmModalState and setSelectedTrackIds will be handled before onRefreshAndClose
        } catch (deleteError: any) {
          toast.error(
            `Removed ${successCount} track(s), making playlist empty, but failed to auto-delete: ${deleteError.message}`,
            { id: toastId, duration: 6000 }
          );
        }
      } else if (successCount > 0 && failCount === 0) {
        // All *selected* tracks removed successfully, playlist not necessarily empty.
        toast.success(`${successCount} track(s) removed successfully.`, {
          id: toastId,
        });
      } else if (successCount > 0 && failCount > 0) {
        // Partial success for selected tracks
        toast(
          // Replaced toast.warning with simple toast
          `${successCount} track(s) removed. Failed to remove ${failCount} track(s).`,
          { id: toastId, duration: 5000 }
        );
      } else if (failCount > 0 && successCount === 0) {
        // All selected tracks failed to remove
        toast.error(
          `Failed to remove ${failCount} selected track(s). Please try again.`,
          { id: toastId }
        );
      } else if (tracksToDelete.length > 0) {
        // No tracks effectively removed, though some were selected.
        toast.dismiss(toastId); // Dismiss loading
        toast("No changes were made to the playlist tracks.", {
          duration: 3000,
        });
      } else {
        // Should not happen if initial guard works (no tracks selected)
        toast.dismiss(toastId);
      }

      setConfirmModalState(initialConfirmModalState); // Close confirmation modal
      setSelectedTrackIds(new Set()); // Clear selection
      // Always refresh and close if the process completed, regardless of outcome,
      // to reflect any partial changes or to remove the auto-deleted playlist from list.
      onRefreshAndClose();
    } catch (error: any) {
      // Catches outer errors like token issue or unhandled exceptions
      toast.error(
        error.message || "An unexpected error occurred during bulk removal.",
        {
          id: toastId, // Overwrite loading toast
        }
      );
      // For critical errors (like token), user might need to re-auth.
      // Modal remains open for user to see the error.
      // Consider if onRefreshAndClose should be called here or not.
      // For now, it's not, to keep modal open on critical errors.
    } finally {
      setIsBulkDeletingTracks(false);
    }
  };

  // Mở modal xác nhận xóa nhiều track
  const handleOpenBulkDeleteTracksModal = () => {
    if (selectedTrackIds.size === 0) {
      toast.error("No tracks selected for deletion.");
      return;
    }
    const tracksCount = selectedTrackIds.size;
    setConfirmModalState({
      isOpen: true,
      title: "Remove Selected Tracks",
      message: (
        <>
          Are you sure you want to remove the selected <b>{tracksCount}</b>{" "}
          track(s) from this playlist?
        </>
      ),
      onConfirm: executeBulkDeleteTracks,
      actionType: "bulkDeleteTracks",
      itemIds: Array.from(selectedTrackIds), // Truyền IDs để có thể dùng trong message nếu cần
    });
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          className={`sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl ${
            theme === "dark" ? "dark bg-zinc-900 border-zinc-700" : "bg-white"
          }`}
        >
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-semibold text-primary">
              {displayPlaylistName}
            </DialogTitle>
            {displayPlaylistDescription && (
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                {displayPlaylistDescription}
              </DialogDescription>
            )}
          </DialogHeader>

          {isLoadingDetails && (
            <div className="flex justify-center items-center h-60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">
                Loading playlist details...
              </p>
            </div>
          )}

          {!isLoadingDetails && detailError && (
            <div className="flex flex-col justify-center items-center h-60 text-destructive bg-destructive/10 p-4 rounded-lg">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Error loading details</p>
              <p className="text-sm">{detailError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="mt-4"
              >
                Close
              </Button>
            </div>
          )}

          {!isLoadingDetails &&
            !detailError &&
            detailedPlaylist &&
            (hasValidTracks ? (
              <ScrollArea className="max-h-[60vh] md:max-h-[70vh] pr-2">
                <Table
                  className={
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }
                >
                  <TableHeader>
                    <TableRow
                      className={
                        theme === "dark" ? "border-zinc-700" : "border-gray-300"
                      }
                    >
                      <TableHead className="w-[40px] px-2 text-center">
                        <Checkbox
                          aria-label="Select all tracks"
                          checked={getSelectAllTracksState()}
                          onCheckedChange={handleSelectAllTracks}
                          disabled={!hasValidTracks || isLoadingDetails}
                        />
                      </TableHead>
                      <TableHead className="w-[50px] text-center">#</TableHead>
                      <TableHead className="w-[80px]">Cover</TableHead>
                      <TableHead>Title & Artist</TableHead>
                      <TableHead>Album</TableHead>
                      <TableHead>Genres</TableHead>
                      <TableHead className="text-right w-[100px]">
                        Duration
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody
                    className={
                      theme === "dark" ? "border-zinc-800" : "border-gray-200"
                    }
                  >
                    {currentTracks.map(
                      (
                        { track: trackData, addedAt, id: playlistTrackId },
                        index
                      ) => {
                        if (!trackData || !trackData.id) return null;
                        return (
                          <TableRow
                            key={playlistTrackId}
                            className={`hover:bg-opacity-50 ${
                              theme === "dark"
                                ? "border-zinc-800 hover:bg-zinc-800"
                                : "border-gray-200 hover:bg-gray-100"
                            }`}
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('input[type="checkbox"]'))
                                return;
                              handleSelectTrackRow(
                                trackData.id,
                                !selectedTrackIds.has(trackData.id)
                              );
                            }}
                          >
                            <TableCell className="w-[40px] px-2 text-center">
                              <Checkbox
                                aria-label={`Select track ${
                                  trackData.title || "Unknown Title"
                                }`}
                                checked={selectedTrackIds.has(trackData.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectTrackRow(trackData.id, checked)
                                }
                                disabled={isLoadingDetails}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              {trackData.coverUrl ? (
                                <Image
                                  src={trackData.coverUrl}
                                  alt={trackData.title || "Track cover"}
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
                            <TableCell className="max-w-xs">
                              <div className="font-medium text-primary truncate">
                                {trackData.title || "Unknown Title"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {trackData.artistName || "Unknown Artist"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                              {trackData.albumTitle || "N/A"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate">
                              {trackData.genres &&
                              Array.isArray(trackData.genres) &&
                              trackData.genres.length > 0
                                ? trackData.genres.join(", ")
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {formatTrackDuration(trackData.duration)}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">
                  This playlist currently has no tracks.
                </p>
              </div>
            ))}

          {!isLoadingDetails &&
            !detailError &&
            !detailedPlaylist &&
            initialPlaylistData && (
              <div className="flex justify-center items-center h-60">
                <p className="text-muted-foreground">
                  Preparing playlist details...
                </p>
              </div>
            )}

          <DialogFooter className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-2 mr-auto">
              {selectedTrackIds.size > 0 && (
                <Button
                  variant="outline"
                  onClick={handleOpenBulkDeleteTracksModal}
                  disabled={isLoadingDetails || isBulkDeletingTracks}
                  className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                >
                  {isBulkDeletingTracks &&
                  confirmModalState.actionType === "bulkDeleteTracks" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove {selectedTrackIds.size} Selected Track(s)
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoadingDetails || isBulkDeletingTracks}
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
          confirmModalState.actionType === "bulkDeleteTracks"
            ? isBulkDeletingTracks
            : confirmModalState.actionType === "deleteTrack"
            ? !!deletingTrackId
            : false
        }
        icon={<DefaultDeleteIcon />}
        confirmButtonText={
          confirmModalState.actionType === "bulkDeleteTracks"
            ? `Remove ${
                confirmModalState.itemIds?.length || selectedTrackIds.size
              } Track(s)`
            : confirmModalState.actionType === "deleteTrack"
            ? "Remove Track"
            : "Confirm"
        }
      />
    </>
  );
};
