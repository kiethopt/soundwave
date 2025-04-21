"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AlreadyExistsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistName: string;
  trackTitle?: string; // Optional: to make the message more specific
}

export function AlreadyExistsDialog({
  open,
  onOpenChange,
  playlistName,
  trackTitle,
}: AlreadyExistsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Already Exists</DialogTitle>
          <DialogDescription>
            {trackTitle
              ? `The track "${trackTitle}" is already in your playlist "${playlistName}".`
              : `This track is already in your playlist "${playlistName}".`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#A57865] hover:bg-[#A57865]/90 text-white" // Brown color
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
