'use client';

import { useState, useRef, use, useEffect } from 'react';
import { api } from '@/utils/api';
import { User } from '@/types';
import { toast } from 'react-toastify';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { AvatarFallback } from '@radix-ui/react-avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { usePathname } from 'next/navigation';

export default function AdminProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { theme } = useTheme();
  const pathname = usePathname();
  const [userData, setUserData] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditing(false);
    setAvatarPreview(null);
    setSelectedAvatar(null);
  }, [pathname]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.admin.getUserById(id, token);
        setUserData(response);
      } catch (error) {
        toast.error('Failed to fetch user data');
      }
    };

    fetchUserData();
  }, [id]);

  // Handle updating profile information
  const handleSave = async () => {
    if (!userData) return;

    const token = localStorage.getItem('userToken');
    if (!token) return;

    // Kiểm tra xem có thay đổi gì không
    const storedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
    const hasChanges =
      userData.name !== storedUserData.name ||
      userData.email !== storedUserData.email ||
      userData.username !== storedUserData.username ||
      selectedAvatar;

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', userData.name || '');
      formData.append('email', userData.email);
      formData.append('username', userData.username || '');
      if (selectedAvatar) {
        formData.append('avatar', selectedAvatar);
      }

      const { user: updatedUser } = await api.admin.updateUser(
        userData.id,
        formData,
        token
      );

      const newUserData = { ...userData, ...updatedUser };
      localStorage.setItem('userData', JSON.stringify(newUserData));
      setUserData(newUserData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      return;
    }

    setIsEditing(false);
    setAvatarPreview(null);
    setSelectedAvatar(null);
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setSelectedAvatar(file);
    }
  };

  return (
    <div
      className={`w-full max-w-2xl mx-auto space-y-8 p-6 backdrop-blur-xs rounded-xl border shadow-xs ${
        theme === 'light'
          ? 'bg-white border-zinc-200/80 text-zinc-700'
          : 'bg-[#121212] border-zinc-700/80 text-zinc-200'
      }`}
    >
      {!userData ? (
        <div
          className={`text-center ${
            theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
          }`}
        >
          Loading...
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-6">
            <Avatar
              className={`h-24 w-24 rounded-full border-2 shadow-xs ${
                theme === 'light' ? 'border-zinc-200/80' : 'border-zinc-700/80'
              }`}
            >
              <AvatarImage
                src={avatarPreview || userData.avatar || '/default-avatar.png'}
                className="rounded-full object-cover"
              />
              <AvatarFallback className="bg-zinc-100">
                {userData.name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button
                variant="uploadAvatar"
                className="h-24 w-24 rounded-full border-2 border-dashed shadow-sm cursor-pointer"
                onClick={handleAvatarClick}
              >
                <Sparkles className="h-6 w-6" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </Button>
            )}
          </div>
          <p className="text-zinc-700 w-full text-center text-sm hover:cursor-pointer">
            {isEditing ? 'Upload a new avatar' : userData.email}
          </p>

          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-700">
                Display Name
              </Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={userData.name || ''}
                onChange={(e) =>
                  setUserData({ ...userData, name: e.target.value })
                }
                disabled={!isEditing}
                className="text-black"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username" className="text-zinc-700">
                Username
              </Label>
              <Input
                id="username"
                placeholder="@username"
                value={userData.username || ''}
                onChange={(e) =>
                  setUserData({ ...userData, username: e.target.value })
                }
                disabled={!isEditing}
                className="bg-white border-zinc-200/80 focus:border-zinc-300 
                          focus:ring-1 focus:ring-zinc-200 placeholder:text-zinc-400"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-zinc-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={(e) =>
                  setUserData({ ...userData, email: e.target.value })
                }
                disabled={!isEditing}
                className="bg-white border-zinc-200/80 focus:border-zinc-300 
                          focus:ring-1 focus:ring-zinc-200 placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-700">
                Account Information
              </h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="text-zinc-700">Role</Label>
                  <Input
                    value={userData.role}
                    disabled
                    className="bg-white border-zinc-200/80"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-zinc-700">Account Status</Label>
                  <Input
                    value={userData.isActive ? 'Active' : 'Inactive'}
                    disabled
                    className="bg-white border-zinc-200/80"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            {isEditing ? (
              <>
                <Button
                  variant="cancel"
                  className="cursor-pointer text-white"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="saveChanges"
                  className="cursor-pointer"
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
