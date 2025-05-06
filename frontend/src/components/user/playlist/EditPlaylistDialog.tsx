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
            ? "bg-white text-black"
            : "bg-[#121212] border-neutral-800 text-white"
        }`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-bold ${
              theme === "light" ? "text-black" : "text-white"
            }`}
          >
            Edit details
          </DialogTitle>
        </DialogHeader>

        {showUnsavedWarning && (
          <Alert
            variant="destructive"
            className="mb-4 bg-red-500/10 border-red-500/30 text-red-400"
          >
            <Info className="h-4 w-4 !text-red-400" />
            <AlertTitle className="text-red-400 font-semibold">
              Unsaved Changes
            </AlertTitle>
            <AlertDescription className="text-red-400/80">
              You have unsaved changes. Close again to discard them, or click
              'Save' to keep them.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="flex items-start gap-4">
            <div
              className={`relative w-40 h-40 flex-shrink-0 ${
                canChangeImage
                  ? "cursor-pointer group"
                  : "cursor-not-allowed opacity-70"
              }`}
              onClick={triggerFileInput}
              title={canChangeImage ? "Change cover photo" : undefined}
            >
              <div className="relative w-full h-full">
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Playlist cover preview"
                    width={160}
                    height={160}
                    className="object-cover w-full h-full rounded-md shadow-md"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center rounded-md shadow-md ${
                      theme === "light" ? "bg-gray-200" : "bg-white/10"
                    }`}
                  >
                    <PlaylistIcon
                      name={formData.name || playlist.name}
                      type={playlist.type}
                      isAIGenerated={playlist.isAIGenerated}
                      size={64}
                      className={theme === "light" ? "" : "text-white/70"}
                    />
                  </div>
                )}
                {canChangeImage && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md">
                    <Pencil className="w-8 h-8 text-white mb-1" />
                    <span className="text-white text-sm font-semibold text-center px-2">
                      Choose Photo
                    </span>
                  </div>
                )}
              </div>
              {canChangeImage && previewImage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`absolute top-1 right-1 rounded-full w-7 h-7 bg-black/60 hover:bg-black/80 ${
                        theme === "light" ? "text-white" : "text-white"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                      title="Options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={
                      theme === "light" ? "" : "bg-[#282828] border-none"
                    }
                  >
                    <DropdownMenuItem
                      onSelect={triggerFileInput}
                      className={
                        theme === "light" ? "" : "text-white hover:bg-white/10"
                      }
                    >
                      <ImageIcon className="w-4 h-4 mr-2" /> Change photo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={handleRemovePhoto}
                      className={
                        theme === "light"
                          ? "text-red-600"
                          : "text-red-500 hover:bg-white/10 focus:text-red-400"
                      }
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Remove photo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={!canChangeImage}
            />

            <div className="flex-grow grid gap-0">
              <div>
                <label
                  htmlFor="name"
                  className={`block text-sm font-medium mb-1.5 ${
                    theme === "light" ? "text-gray-700" : "text-neutral-300"
                  }`}
                >
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Add a name"
                  maxLength={50}
                  required
                  className={`text-base font-semibold ${
                    theme === "light"
                      ? "border-gray-300 focus:border-black"
                      : "bg-white/[.07] border-white/20 focus:border-white text-white"
                  }`}
                  disabled={isSpecialPlaylist}
                />
                <div
                  className={`text-xs mt-1.5 text-right ${
                    theme === "light" ? "text-gray-500" : "text-neutral-400"
                  }`}
                >
                  {formData.name.length}/50
                </div>
              </div>
              <div>
                <label
                  htmlFor="description"
                  className={`block text-sm font-medium mb-1.5 ${
                    theme === "light" ? "text-gray-700" : "text-neutral-300"
                  }`}
                >
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Add an optional description"
                  maxLength={120}
                  rows={4}
                  className={`text-sm resize-none ${
                    theme === "light"
                      ? "border-gray-300 focus:border-black"
                      : "bg-white/[.07] border-white/20 focus:border-white text-white"
                  }`}
                  disabled={isSpecialPlaylist}
                />
                <div
                  className={`text-xs mt-1.5 text-right ${
                    theme === "light" ? "text-gray-500" : "text-neutral-400"
                  }`}
                >
                  {formData.description.length}/120
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p
              className={`text-xs ${
                theme === "light" ? "text-gray-500" : "text-neutral-500"
              }`}
            >
              By continuing, you agree to allow Soundwave to access the images
              you have chosen to upload. Please ensure you have permission to
              upload the images.
            </p>
          </div>

          <div className="flex justify-end mt-2">
            <Button
              type="submit"
              disabled={isLoading || isSpecialPlaylist}
              className={`font-bold px-8 py-3 rounded-md bg-[#A57865] text-white hover:bg-[#8a6353] disabled:opacity-50`}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
