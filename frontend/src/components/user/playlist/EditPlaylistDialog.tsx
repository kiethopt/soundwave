"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import Image from "next/image";
import {
  Pencil,
  Image as ImageIcon,
  Trash2,
  Info,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlaylistIcon } from "./PlaylistIcon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EditPlaylistDialogProps {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSpecialPlaylist?: boolean;
  onPlaylistUpdated?: (updatedPlaylist: Playlist) => void;
}

interface FormData {
  name: string;
  description: string;
  coverFile?: File | null;
  removeCover?: boolean;
}

export function EditPlaylistDialog({
  playlist,
  open,
  onOpenChange: parentOnOpenChange,
  isSpecialPlaylist = false,
  onPlaylistUpdated,
}: EditPlaylistDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const [formData, setFormData] = useState<Omit<FormData, "privacy">>({
    name: playlist.name,
    description: playlist.description || "",
    coverFile: null,
    removeCover: false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: playlist.name,
        description: playlist.description || "",
        coverFile: null,
        removeCover: false,
      });
      setPreviewImage(playlist.coverUrl || null);
      setHasChanges(false);
      setShowUnsavedWarning(false);
    }
  }, [open, playlist]);

  const isVibeRewind = playlist.name === "Vibe Rewind";
  const isFavorite = playlist.type === "FAVORITE";
  const canChangeImage = playlist.type === "NORMAL";

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setHasChanges(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        coverFile: file,
        removeCover: false,
      }));
      const fileUrl = URL.createObjectURL(file);
      setPreviewImage(fileUrl);
      setHasChanges(true);
    }
  };

  const triggerFileInput = () => {
    if (!canChangeImage) return;
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    if (!canChangeImage) return;
    setPreviewImage(null);
    setFormData((prev) => ({ ...prev, coverFile: null, removeCover: true }));
    setHasChanges(true);
  };

  const handleCloseIntent = (newOpenState: boolean) => {
    if (!newOpenState) {
      // User is trying to close the dialog
      if (hasChanges && !isLoading) {
        if (!showUnsavedWarning) {
          // First attempt to close with unsaved changes: show warning
          setShowUnsavedWarning(true);
          // Keep the dialog open
        } else {
          // Second attempt to close (warning is already visible): discard changes and close
          setShowUnsavedWarning(false); // Hide warning for next time
          parentOnOpenChange(false); // Close the dialog
        }
      } else {
        // No unsaved changes, or loading (submit): close normally
        setShowUnsavedWarning(false);
        parentOnOpenChange(false);
      }
    } else {
      // User is opening the dialog
      setShowUnsavedWarning(false); // Ensure warning is hidden on open
      parentOnOpenChange(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowUnsavedWarning(false);

    if (!formData.name.trim()) {
      toast.error("Playlist name cannot be empty.");
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        throw new Error("Please log in to perform this action");
      }

      let payload: FormData | BodyInit;
      let headers: HeadersInit = {};
      const method = "PATCH";
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/playlists/${playlist.id}`;
      let dataChanged = false;

      const updatePayload: any = {};
      if (formData.name !== playlist.name) {
        updatePayload.name = formData.name;
        dataChanged = true;
      }
      if (formData.description !== (playlist.description || "")) {
        updatePayload.description = formData.description;
        dataChanged = true;
      }
      if (formData.removeCover && playlist.coverUrl) {
        updatePayload.coverUrl = null;
        dataChanged = true;
      }

      if (formData.coverFile && canChangeImage) {
        const formDataToSend = new FormData();
        formDataToSend.append("name", formData.name);
        formDataToSend.append("description", formData.description || "");
        formDataToSend.append("cover", formData.coverFile);
        payload = formDataToSend;
        dataChanged = true;
      } else if (dataChanged) {
        payload = JSON.stringify(updatePayload);
        headers["Content-Type"] = "application/json";
      } else {
        toast("No changes to save.");
        setIsLoading(false);
        parentOnOpenChange(false);
        return;
      }

      headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to update playlist" }));
        throw new Error(errorData.message || "Failed to update playlist");
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Playlist details updated successfully");
        if (onPlaylistUpdated && result.data) {
          onPlaylistUpdated(result.data);
        }
        setHasChanges(false);
        parentOnOpenChange(false);
      } else {
        throw new Error(result.message || "Failed to update playlist details");
      }
    } catch (error: any) {
      console.error("Error updating playlist:", error);
      toast.error(error.message || "Unable to update playlist details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseIntent}>
      <DialogContent
        className={`sm:max-w-[500px] ${
          theme === "light"
            ? "bg-white text-gray-900 border border-gray-200"
            : "bg-[#121212] text-white border border-white/10"
        }`}
        onInteractOutside={(e) => {
          if (showUnsavedWarning) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle
            className={theme === "light" ? "text-gray-900" : "text-white"}
          >
            Edit details
          </DialogTitle>
        </DialogHeader>

        {showUnsavedWarning && (
          <Alert variant="default" className="mt-4 mb-0 p-3 rounded-md">
            <Info className="h-4 w-4" />
            <AlertTitle className="font-semibold text-sm">
              Unsaved Changes
            </AlertTitle>
            <AlertDescription className="text-xs">
              Save your changes before closing.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6 pt-4">
          <div className="col-span-1 flex flex-col items-center justify-start pt-1">
            <div className="relative group w-32 h-32">
              <div
                className={`w-full h-full rounded-md bg-neutral-800 flex items-center justify-center overflow-hidden ${
                  !canChangeImage ? "cursor-not-allowed" : ""
                }`}
              >
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Playlist cover preview"
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <PlaylistIcon
                    name={playlist.name}
                    type={playlist.type}
                    isAIGenerated={playlist.isAIGenerated}
                    size={48}
                    className="text-neutral-500"
                  />
                )}
              </div>

              {canChangeImage && (
                <div
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md"
                  onClick={triggerFileInput}
                  title="Change cover image"
                >
                  <Pencil className="w-8 h-8 text-white mb-1" />
                  <span className="text-white text-xs font-semibold">
                    Chọn ảnh
                  </span>
                </div>
              )}

              {canChangeImage && previewImage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-8 w-8 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-50"
                      title="More options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 bg-[#282828] border-none text-white p-1"
                    align="end"
                  >
                    <DropdownMenuItem
                      onSelect={triggerFileInput}
                      className="hover:bg-[#3E3E3E] cursor-pointer text-sm px-3 py-2 rounded-[3px]"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Change photo
                    </DropdownMenuItem>
                    {previewImage && (
                      <DropdownMenuItem
                        onSelect={handleRemovePhoto}
                        className="text-red-500 hover:bg-[#3E3E3E] hover:text-red-500 focus:text-red-500 cursor-pointer text-sm px-3 py-2 rounded-[3px]"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove photo
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={!canChangeImage}
            />
          </div>

          <div className="col-span-2 space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                readOnly={isVibeRewind || isFavorite}
                className={
                  theme === "light"
                    ? "border-gray-200 focus:border-gray-300"
                    : "border-neutral-700 bg-neutral-800 focus:border-white/20 text-white"
                }
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add an optional description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={
                  theme === "light"
                    ? "border-gray-200 focus:border-gray-300"
                    : "border-neutral-700 bg-neutral-800 focus:border-white/20 text-white"
                }
              />
            </div>
          </div>

          <div className="col-span-3 mt-4">
            <p className="text-xs text-gray-400 mb-4">
              By continuing, you agree to allow Soundwave to access the images
              you have chosen to upload. Please ensure you have permission to
              upload the images.
            </p>
          </div>

          <div className="col-span-3 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              className={
                theme === "light"
                  ? "bg-black text-white hover:bg-black/80"
                  : "bg-[#A57865] text-white hover:bg-[#A57865]/90"
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
