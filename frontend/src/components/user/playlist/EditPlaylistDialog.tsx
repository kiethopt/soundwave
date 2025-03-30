'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Playlist } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';

interface EditPlaylistDialogProps {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSpecialPlaylist?: boolean;
}

interface FormData {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
}

export function EditPlaylistDialog({
  playlist,
  open,
  onOpenChange,
  isSpecialPlaylist = false,
}: EditPlaylistDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: playlist.name,
    description: playlist.description || '',
    privacy: playlist.privacy,
  });

  // Check for special playlists - this covers both Vibe Rewind and Favorites
  const isVibeRewind = playlist.name === 'Vibe Rewind';
  const isFavorite = playlist.type === 'FAVORITE';
  const isFixedPrivacy = isSpecialPlaylist || isVibeRewind || isFavorite;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      await api.playlists.update(playlist.id, formData, token);
      toast.success('Đã cập nhật playlist');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Không thể cập nhật playlist');
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

  const handlePrivacyChange = (value: 'PUBLIC' | 'PRIVATE') => {
    setFormData((prev) => ({
      ...prev,
      privacy: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="text-white">
          <DialogTitle>Chỉnh sửa playlist</DialogTitle>
          {isFixedPrivacy && (
            <p className="text-sm text-white/60 mt-2">
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
              className="text-white"
              required
              readOnly={isVibeRewind || isFavorite}
            />
          </div>
          <div className="space-y-2">
            <Textarea
              name="description"
              placeholder="Mô tả (tùy chọn)"
              value={formData.description}
              onChange={handleInputChange}
              className="text-white"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Select
              value={formData.privacy}
              onValueChange={handlePrivacyChange}
              disabled={isFixedPrivacy}
            >
              <SelectTrigger className="text-white">
                <SelectValue placeholder="Chọn quyền riêng tư" />
              </SelectTrigger>
              <SelectContent className="text-white bg-[#121212]">
                <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                <SelectItem value="PUBLIC">Công khai</SelectItem>
              </SelectContent>
            </Select>
            {isFixedPrivacy && (
              <p className="text-xs text-white/60 mt-1">
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
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
