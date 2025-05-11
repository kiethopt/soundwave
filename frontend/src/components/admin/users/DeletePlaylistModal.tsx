"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DeletePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  playlistName: string;
  isDeleting: boolean;
  theme?: "dark" | "light";
}

export const DeletePlaylistModal: React.FC<DeletePlaylistModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  playlistName,
  isDeleting,
  theme = "light",
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-md ${
          theme === "dark" ? "dark bg-zinc-900 border-zinc-700" : "bg-white"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-destructive">
            Delete System Playlist
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Are you sure you want to delete the playlist{" "}
            <span className="font-medium text-foreground">
              "{playlistName}"
            </span>{" "}
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="mt-2 sm:mt-0"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="mt-2 sm:mt-0"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Playlist"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
