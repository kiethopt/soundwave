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

interface GeneratePlaylistConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
  userId?: string;
  isGenerating: boolean;
  theme?: "dark" | "light";
}

export const GeneratePlaylistConfirmModal: React.FC<
  GeneratePlaylistConfirmModalProps
> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userId,
  isGenerating,
  theme = "light",
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-[480px] ${
          theme === "dark" ? "dark bg-zinc-900 border-zinc-700" : "bg-white"
        }`}
      >
        <DialogHeader>
          <DialogTitle
            className={theme === "dark" ? "text-white" : "text-gray-900"}
          >
            Confirm System Playlist Generation
          </DialogTitle>
        </DialogHeader>
        <DialogDescription
          asChild
          className={`py-4 ${
            theme === "dark" ? "text-zinc-300" : "text-gray-600"
          }`}
        >
          <div>
            A new System Playlist will be generated for user:
            <br />
            <strong>Name:</strong> {userName || "N/A"}
            <br />
            <strong>User ID:</strong> {userId || "N/A"}
            <div className="mt-2">
              The system will analyze this user's listening history to create a
              personalized playlist using AI. This process may take a few
              moments.
            </div>
            <div className="mt-3 font-medium">
              Are you sure you want to proceed?
            </div>
          </div>
        </DialogDescription>
        <DialogFooter
          className={`pt-4 ${
            theme === "dark" ? "border-t border-zinc-700" : "border-t"
          }`}
        >
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Confirm & Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
