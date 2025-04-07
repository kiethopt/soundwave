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
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={
              theme === "light"
                ? "hover:bg-gray-100"
                : "hover:bg-neutral-800 text-white"
            }
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className={
              theme === "light"
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
