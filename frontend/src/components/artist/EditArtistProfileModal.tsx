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
import { ArtistProfile } from '@/types';
import { api } from '@/utils/api';
import Image from 'next/image';
import { toast } from 'react-toastify';

interface EditArtistProfileModalProps {
  artistProfile: ArtistProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  artistName: string;
  bio: string;
  avatar?: File | string;
}

export function EditArtistProfileModal({
  artistProfile,
  open,
  onOpenChange,
}: EditArtistProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    artistName: artistProfile.artistName,
    bio: artistProfile.bio || '',
    avatar: artistProfile.avatar || '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string>(
    artistProfile.avatar || '/images/default-avatar.jpg'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        avatar: file,
      }));
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Please login again');
        return;
      }
      console.log('formData', formData);
      await api.artists.updateProfile(artistProfile.id, formData, token);

      toast.success('Updated Artist Profile');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Không thể cập nhật Artist Profile');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="text-white">
          <DialogTitle>Edit Artist Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div className="relative w-[200px] h-[200px] flex mx-auto justify-center group mt-4">
            <Image
              src={avatarPreview}
              alt="Avatar"
              width={200}
              height={200}
              className="rounded-full w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full text-white font-semibold cursor-pointer"
              onClick={() => document.getElementById('avatarInput')?.click()}
            >
              Change Avatar
            </div>
            <input
              id="avatarInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="space-y-4">
            <label
              htmlFor="artistName"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Artist Name
            </label>

            <Input
              id="artistName"
              name="artistName"
              placeholder="Artist Name"
              value={formData.artistName}
              onChange={handleInputChange}
              className="text-white"
              required
            />

            <label
              htmlFor="bio"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Bio
            </label>

            <Textarea
              id="bio"
              name="bio"
              placeholder="Bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={3}
              className="text-white"
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isLoading}
              className=""
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
