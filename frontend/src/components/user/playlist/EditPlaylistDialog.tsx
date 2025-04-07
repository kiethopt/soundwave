"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Playlist } from "@/types";
import { api } from "@/utils/api";
import toast from "react-hot-toast";
import { useTheme } from "@/contexts/ThemeContext";

interface EditPlaylistDialogProps {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSpecialPlaylist?: boolean;
}

interface FormData {
  name: string;
  description: string;
  privacy: "PUBLIC" | "PRIVATE";
}

export function EditPlaylistDialog({
  playlist,
  open,
  onOpenChange,
  isSpecialPlaylist = false,
}: EditPlaylistDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const [formData, setFormData] = useState<FormData>({
    name: playlist.name,
    description: playlist.description || "",
    privacy: playlist.privacy,
  });

  const isVibeRewind = playlist.name === "Vibe Rewind";
  const isFavorite = playlist.type === "FAVORITE";
  const isFixedPrivacy = isSpecialPlaylist || isVibeRewind || isFavorite;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("Please log in again");
        return;
      }

      await api.playlists.update(playlist.id, formData, token);
      toast.success("Đã cập nhật playlist");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error("Unable to update playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePrivacyChange = (value: "PUBLIC" | "PRIVATE") => {
    setFormData((prev) => ({
      ...prev,
      privacy: value,
    }));
  };

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
            Edit playlist
          </DialogTitle>
          {isFixedPrivacy && (
            <p
              className={`text-sm mt-2 ${
                theme === "light" ? "text-gray-500" : "text-white/60"
              }`}
            >
              This is a special playlist with fixed privacy settings
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              name="name"
              placeholder="Tên playlist"
              value={formData.name}
              onChange={handleInputChange}
              required
              readOnly={isVibeRewind || isFavorite}
              className={
                theme === "light"
                  ? "border-gray-200 focus:border-gray-300"
                  : "border-white/10 focus:border-white/20 text-white"
              }
            />
          </div>

          <div className="space-y-2">
            <Textarea
              name="description"
              placeholder="Mô tả (tùy chọn)"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={
                theme === "light"
                  ? "border-gray-200 focus:border-gray-300"
                  : "border-white/10 focus:border-white/20 text-white"
              }
            />
          </div>

          <div className="space-y-2">
            <Select
              value={formData.privacy}
              onValueChange={handlePrivacyChange}
              disabled={isFixedPrivacy}
            >
              <SelectTrigger
                className={
                  theme === "light"
                    ? "border-gray-200 bg-white text-gray-900 focus:border-gray-300"
                    : "border-white/10 bg-[#121212] text-white focus:border-white/20"
                }
              >
                <SelectValue placeholder="Select privacy" />
              </SelectTrigger>
              <SelectContent
                className={
                  theme === "light"
                    ? "bg-white text-gray-900 border-gray-200"
                    : "bg-[#121212] text-white border-white/10"
                }
              >
                <SelectItem
                  value="PRIVATE"
                  className={theme === "light" ? "text-gray-900" : "text-white"}
                >
                  Private
                </SelectItem>
                <SelectItem
                  value="PUBLIC"
                  className={theme === "light" ? "text-gray-900" : "text-white"}
                >
                  Public
                </SelectItem>
              </SelectContent>
            </Select>
            {isFixedPrivacy && (
              <p
                className={`text-xs mt-1 ${
                  theme === "light" ? "text-gray-500" : "text-white/60"
                }`}
              >
                This playlist is always private and cannot be changed
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className={
                theme === "light"
                  ? "hover:bg-gray-100"
                  : "hover:bg-neutral-800 text-white"
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={
                theme === "light"
                  ? "bg-black text-white hover:bg-black/80"
                  : "bg-white text-black hover:bg-white/80"
              }
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
