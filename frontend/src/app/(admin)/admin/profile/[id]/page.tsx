'use client';

import type React from 'react';

import { useState, useRef, use, useEffect } from 'react';
import { api } from '@/utils/api';
import type { User } from '@/types';
import toast from 'react-hot-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Camera,
  UserIcon,
  Mail,
  AtSign,
  Shield,
  CircleCheck,
  Lock,
  KeyRound,
  Save,
  X,
} from 'lucide-react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { AvatarFallback } from '@radix-ui/react-avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { usePathname } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

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

  // Handle Save
  const handleSave = async () => {
    if (!userData) return;

    const token = localStorage.getItem('userToken');
    if (!token) return;

    // Kiểm tra mật khẩu nếu người dùng đang thay đổi mật khẩu
    if (passwordData.password) {
      if (passwordData.password !== passwordData.confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
      if (passwordData.password.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return;
      }
      if (!passwordData.currentPassword) {
        setPasswordError('Current password is required');
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('name', userData.name || '');
      formData.append('email', userData.email);
      formData.append('username', userData.username || '');

      // Thêm mật khẩu vào formData nếu có
      if (passwordData.password) {
        formData.append('currentPassword', passwordData.currentPassword);
        formData.append('password', passwordData.password);
      }

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

      // Reset trường password sau khi cập nhật
      setPasswordData({
        currentPassword: '',
        password: '',
        confirmPassword: '',
      });

      toast.success('Profile updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Current password is incorrect') {
          setPasswordError('Current password is incorrect');
        } else {
          toast.error(error.message || 'Failed to update profile');
        }
      } else {
        toast.error('Failed to update profile');
      }
      return;
    }

    setIsEditing(false);
    setAvatarPreview(null);
    setSelectedAvatar(null);
    setPasswordError('');
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  if (!userData) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-full bg-zinc-200"></div>
          <div className="h-6 w-48 rounded bg-zinc-200"></div>
          <div className="h-4 w-64 rounded bg-zinc-200"></div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={`w-full max-w-3xl mx-auto shadow-md ${
        theme === 'light'
          ? 'bg-white border-zinc-200/80'
          : 'bg-zinc-900 border-zinc-700/80'
      }`}
    >
      <CardHeader className="pb-0">
        <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
          <div className="relative group">
            <Avatar
              className={`h-28 w-28 rounded-full border-4 ${
                isEditing
                  ? 'cursor-pointer border-primary/50'
                  : theme === 'light'
                  ? 'border-zinc-100'
                  : 'border-zinc-800'
              }`}
              onClick={handleAvatarClick}
            >
              <AvatarImage
                src={avatarPreview || userData.avatar || '/default-avatar.png'}
                className="rounded-full object-cover"
                alt={userData.name || 'Profile'}
              />
              <AvatarFallback
                className={`${
                  theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-800'
                }`}
              >
                {userData.name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 cursor-pointer"
                onClick={handleAvatarClick}
              >
                <Camera className="h-8 w-8 text-white" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center md:items-start space-y-2">
            <h2
              className={`text-2xl font-bold ${
                theme === 'light' ? 'text-zinc-800' : 'text-zinc-100'
              }`}
            >
              {userData.name || 'Admin User'}
            </h2>
            <div className="flex items-center gap-2">
              <Badge
                variant={userData.isActive ? 'success' : 'destructive'}
                className="px-2 py-0.5"
              >
                {userData.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline" className="px-2 py-0.5 capitalize">
                {userData.role}
              </Badge>
            </div>
            <p
              className={`text-sm ${
                theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              {userData.email}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <Separator
          className={theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-700'}
        />

        <div className="grid gap-6">
          <div className="space-y-4">
            <h3
              className={`text-sm font-medium flex items-center gap-2 ${
                theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              Personal Information
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className={
                    theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                  }
                >
                  Display Name
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={userData.name || ''}
                    onChange={(e) =>
                      setUserData({ ...userData, name: e.target.value })
                    }
                    disabled={!isEditing}
                    className={`pl-10 ${
                      theme === 'light'
                        ? 'bg-white border-zinc-200 focus:border-zinc-300'
                        : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'
                    }`}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="username"
                  className={
                    theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                  }
                >
                  Username
                </Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="@username"
                    value={userData.username || ''}
                    onChange={(e) =>
                      setUserData({ ...userData, username: e.target.value })
                    }
                    disabled={!isEditing}
                    className={`pl-10 ${
                      theme === 'light'
                        ? 'bg-white border-zinc-200 focus:border-zinc-300'
                        : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="email"
                className={
                  theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                }
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={userData.email}
                  onChange={(e) =>
                    setUserData({ ...userData, email: e.target.value })
                  }
                  disabled={!isEditing}
                  className={`pl-10 ${
                    theme === 'light'
                      ? 'bg-white border-zinc-200 focus:border-zinc-300'
                      : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'
                  }`}
                />
              </div>
            </div>
          </div>

          <Separator
            className={theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-700'}
          />

          <div className="space-y-4">
            <h3
              className={`text-sm font-medium flex items-center gap-2 ${
                theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'
              }`}
            >
              <Shield className="h-4 w-4" />
              Account Information
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label
                  className={
                    theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                  }
                >
                  Role
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userData.role}
                    disabled
                    className={`pl-10 ${
                      theme === 'light'
                        ? 'bg-zinc-50 border-zinc-200'
                        : 'bg-zinc-800/50 border-zinc-700'
                    }`}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label
                  className={
                    theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                  }
                >
                  Account Status
                </Label>
                <div className="relative">
                  <CircleCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userData.isActive ? 'Active' : 'Inactive'}
                    disabled
                    className={`pl-10 ${
                      theme === 'light'
                        ? 'bg-zinc-50 border-zinc-200'
                        : 'bg-zinc-800/50 border-zinc-700'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {isEditing && (
            <>
              <Separator
                className={theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-700'}
              />

              <div className="space-y-4">
                <h3
                  className={`text-sm font-medium flex items-center gap-2 ${
                    theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </h3>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="currentPassword"
                      className={
                        theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                      }
                    >
                      Current Password
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className={`pl-10 ${
                          theme === 'light'
                            ? 'bg-white border-zinc-200 focus:border-zinc-300'
                            : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label
                        htmlFor="password"
                        className={
                          theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                        }
                      >
                        New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={passwordData.password}
                          onChange={handlePasswordChange}
                          className={`pl-10 ${
                            theme === 'light'
                              ? 'bg-white border-zinc-200 focus:border-zinc-300'
                              : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="confirmPassword"
                        className={
                          theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'
                        }
                      >
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={`pl-10 ${
                            theme === 'light'
                              ? 'bg-white border-zinc-200 focus:border-zinc-300'
                              : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {passwordError && (
                    <p className="text-destructive text-sm font-medium">
                      {passwordError}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-4 pt-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setIsEditing(false);
                setPasswordData({
                  currentPassword: '',
                  password: '',
                  confirmPassword: '',
                });
                setPasswordError('');
              }}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <UserIcon className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
