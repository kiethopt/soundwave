import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

interface DeletePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  playlistName: string;
}

export function DeletePlaylistDialog({
  open,
  onOpenChange,
  onConfirm,
  playlistName,
}: DeletePlaylistDialogProps) {
  const { theme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[425px] ${
          theme === "light"
            ? "bg-white text-gray-900 border border-gray-200"
            : "bg-[#121212] text-white border border-white/10"
        }`}
      >
        <DialogHeader>
          <DialogTitle
            className={theme === "light" ? "text-gray-900" : "text-white"}
          >
            Delete Playlist
          </DialogTitle>
          <DialogDescription
            className={theme === "light" ? "text-gray-500" : "text-white/60"}
          >
            Are you sure you want to delete the playlist "{playlistName}"? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={onConfirm}
            className={`bg-[#A57865] text-white hover:bg-[#A57865]/90 ${
              theme === "light" ? "" : ""
            }`}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
