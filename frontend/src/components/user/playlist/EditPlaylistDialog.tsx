"use client";

import { useState, useRef } from "react";
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
  privacy: "PUBLIC" | "PRIVATE";
  coverFile?: File | null;
}

export function EditPlaylistDialog({
  playlist,
  open,
  onOpenChange,
  isSpecialPlaylist = false,
  onPlaylistUpdated,
}: EditPlaylistDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(
    playlist.coverUrl || null
  );

  const [formData, setFormData] = useState<FormData>({
    name: playlist.name,
    description: playlist.description || "",
    privacy: playlist.privacy,
    coverFile: null,
  });

  const isVibeRewind = playlist.name === "Vibe Rewind";
  const isFavorite = playlist.type === "FAVORITE";
  const isWelcomeMix = playlist.name === "Welcome Mix";
  const isAIGenerated = playlist.isAIGenerated;
  const isFixedPrivacy = isSpecialPlaylist || isVibeRewind || isFavorite;

  // Chỉ cho phép đổi hình ảnh với playlist thường (normal)
  const canChangeImage =
    !isVibeRewind &&
    !isFavorite &&
    !isWelcomeMix &&
    !isAIGenerated &&
    playlist.type !== "SYSTEM";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("Please log in again");
        return;
      }

      // Nếu có file hình ảnh mới thì sử dụng FormData để gửi
      if (formData.coverFile && canChangeImage) {
        const formDataToSend = new FormData();
        formDataToSend.append("name", formData.name);
        formDataToSend.append("description", formData.description || "");
        formDataToSend.append("privacy", formData.privacy);
        formDataToSend.append("cover", formData.coverFile);

        // Sử dụng fetch trực tiếp thay vì api.playlists.update
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/playlists/${playlist.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formDataToSend,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update playlist");
        }

        const result = await response.json();
        if (result.success) {
          toast.success("Đã cập nhật playlist");
          // Gọi callback với playlist đã cập nhật
          if (onPlaylistUpdated && result.data) {
            onPlaylistUpdated(result.data);
          }
          onOpenChange(false);
        }
      } else {
        // Nếu không có file mới, sử dụng API bình thường
        const response = await api.playlists.update(
          playlist.id,
          {
            name: formData.name,
            description: formData.description,
            privacy: formData.privacy,
          },
          token
        );
        toast.success("Playlist updated successfully");
        // Gọi callback với playlist đã cập nhật
        if (onPlaylistUpdated && response.data) {
          onPlaylistUpdated(response.data);
        }
        onOpenChange(false);
      }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        coverFile: file,
      }));

      // Tạo URL preview cho hình ảnh
      const fileUrl = URL.createObjectURL(file);
      setPreviewImage(fileUrl);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
          {/* Hình ảnh bìa - chỉ hiển thị cho playlist normal */}
          {canChangeImage && (
            <div className="flex flex-col items-center space-y-2">
              <div
                className="w-32 h-32 rounded-md overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity"
                onClick={triggerFileInput}
              >
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Playlist cover"
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center ${
                      theme === "light" ? "bg-gray-200" : "bg-neutral-800"
                    }`}
                  >
                    <svg
                      className="w-12 h-12 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium">
                    Change cover
                  </span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-xs text-center text-gray-500">
                Click to upload a new cover image
              </span>
            </div>
          )}

          {/* Hiển thị hình ảnh bìa nhưng không cho phép thay đổi với playlist đặc biệt */}
          {!canChangeImage && playlist.coverUrl && (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-32 h-32 rounded-md overflow-hidden relative">
                <Image
                  src={playlist.coverUrl}
                  alt="Playlist cover"
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              </div>
              <span className="text-xs text-center text-gray-500">
                Cover image cannot be changed for this type of playlist
              </span>
            </div>
          )}

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
