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
  CalendarDays,
  Crown,
  Star,
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
import { cn } from '@/lib/utils';

export default function AdminProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { theme } = useTheme();
  const pathname = usePathname();
  const [userData, setUserData] = useState<User | null>(null);
  const [initialUserData, setInitialUserData] = useState<User | null>(null);
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
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);

  useEffect(() => {
    setIsEditing(false);
    setAvatarPreview(null);
    setSelectedAvatar(null);
    setUserData(null);
    setInitialUserData(null);
  }, [pathname, id]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.admin.getUserById(id, token);
        setUserData(response);
        setInitialUserData(response);
      } catch (error) {
        toast.error('Failed to fetch user data');
      }
    };

    if (id) {
      fetchUserData();
    }
  }, [id]);

  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        setLoggedInUserId(parsedUser?.id || null);
      } catch (e) {
        console.error("Error parsing logged-in user data:", e);
      }
    }
  }, []);

  // Handle Save
  const handleSave = async () => {
    if (!userData) return;

    const token = localStorage.getItem('userToken');
    if (!token) return;

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
      setUserData(newUserData);
      setInitialUserData(newUserData);

      if (loggedInUserId && newUserData.id === loggedInUserId) {
        localStorage.setItem('userData', JSON.stringify(newUserData));
        window.dispatchEvent(new StorageEvent('storage', { key: 'userData' }));
      }

      // Reset trường password sau khi cập nhật
      setPasswordData({
        currentPassword: '',
        password: '',
        confirmPassword: '',
      });

      toast.success('Profile updated successfully');
      setIsEditing(false);
      setAvatarPreview(null);
      setSelectedAvatar(null);
      setPasswordError('');
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
    }
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
    setPasswordError('');
  };

  const handleCancel = () => {
    if (initialUserData) {
      setUserData(initialUserData);
    }
    setIsEditing(false);
    setPasswordData({ currentPassword: '', password: '', confirmPassword: '' });
    setPasswordError('');
    setAvatarPreview(null);
    setSelectedAvatar(null);
  };

  const handleEditClick = () => {
    if (userData) {
      setInitialUserData(userData);
    }
    setIsEditing(true);
  };

  if (!userData) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
          <div className="h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-700"></div>
          <div className="h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-700"></div>
        </div>
      </div>
    );
  }


  const formatDate = (dateString?: string | Date): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Định dạng ngày tháng năm giờ phút giây DD-MM-YYYY HH:mm:ss
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid Date';
    }
  };

  return (
    <Card
      className={`w-full mx-auto shadow-md ${
        theme === 'light'
          ? 'bg-white border-zinc-200/80'
          : 'bg-zinc-900 border-zinc-700/80'
      }`}
    >
      <CardHeader className="pb-0 px-4 md:px-6 lg:px-8 pt-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative group">
            <Avatar
              className={`h-28 w-28 rounded-full border-4 ${
                isEditing
                  ? 'cursor-pointer border-primary/50 hover:border-primary'
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
                {userData.name?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200"
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={userData.isActive ? 'success' : 'destructive'}
                className="px-2 py-0.5"
              >
                {userData.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline" className="px-2 py-0.5 capitalize">
                {userData.role}
              </Badge>
              {userData.role === 'ADMIN' && typeof userData.adminLevel === 'number' && (
                  <Badge variant="secondary" className="px-2 py-0.5 flex items-center gap-1">
                      {userData.adminLevel === 1 && <Crown className="h-3 w-3 text-yellow-500" />}
                      {userData.adminLevel === 2 && <Star className="h-3 w-3 text-blue-400 fill-current" />}
                      {userData.adminLevel === 3 && <Star className="h-3 w-3 text-gray-400" />}
                      <span>Level {userData.adminLevel}</span>
                  </Badge>
              )}
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

      <CardContent className="px-4 md:px-6 lg:px-8 pt-6">
        <Separator
          className={theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-700 mb-6'}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0">
          {/* --- Cell 1: Personal Information --- */}
          <div className="space-y-6 mb-6 lg:mb-0">
            <h3
              className={`text-lg font-semibold flex items-center gap-2 mt-6 ${
                theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'
              }`}
            >
              <UserIcon className="h-5 w-5" />
              Personal Information
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}
                >
                  Display Name
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={userData.name || ''}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    disabled={!isEditing}
                    className={`pl-10 ${theme === 'light' ? 'bg-white border-zinc-200 focus:border-zinc-300' : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'}`}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="username"
                  className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}
                >
                  Username
                </Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="@username"
                    value={userData.username || ''}
                    onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                    disabled={!isEditing}
                    className={`pl-10 ${theme === 'light' ? 'bg-white border-zinc-200 focus:border-zinc-300' : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'}`}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="email"
                className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  disabled={!isEditing}
                  className={`pl-10 ${theme === 'light' ? 'bg-white border-zinc-200 focus:border-zinc-300' : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'}`}
                />
              </div>
            </div>
          </div>

          {/* --- Cell 2: Account Information --- */}
          <div className="space-y-6 mb-6 lg:mb-0">
            <h3
              className={`text-lg font-semibold flex items-center gap-2 mt-6 ${
                theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'
              }`}
            >
              <Shield className="h-5 w-5" />
              Account Information
            </h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}>
                    Role
                  </Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={userData.role}
                      disabled
                      className={`pl-10 ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700'}`}
                    />
                  </div>
                </div>

                {userData.role === 'ADMIN' && typeof userData.adminLevel === 'number' && (
                  <div className="grid gap-2">
                    <Label className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}>
                      Admin Level
                    </Label>
                    <div
                      className={cn(
                        'flex items-center h-9 w-fit rounded-md border px-3 text-sm',
                        'opacity-70 cursor-not-allowed select-none',
                        theme === 'light'
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {userData.adminLevel === 1 && <Crown className="h-4 w-4 text-yellow-500" />}
                        {userData.adminLevel === 2 && <Star className="h-4 w-4 text-blue-400 fill-current" />}
                        {userData.adminLevel === 3 && <Star className="h-4 w-4 text-gray-400" />}
                        <span>Level {userData.adminLevel}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}>
                  Account Status
                </Label>
                <div className="relative">
                  <CircleCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userData.isActive ? 'Active' : 'Inactive'}
                    disabled
                    className={`pl-10 ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --- Cell 3: Change Password --- */}
          <div className="space-y-6 mb-6 lg:mb-0">
            <Separator className={`mt-6 ${theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-700'}`} />
            <h3
              className={`text-lg font-semibold flex items-center gap-2 mt-6 ${
                theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'
              }`}
            >
              <Lock className="h-5 w-5" />
              Change Password
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="currentPassword"
                  className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}
                >
                  Current Password
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    disabled={!isEditing}
                    className={`pl-10 ${theme === 'light' ? 'bg-white border-zinc-200 focus:border-zinc-300' : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'}`}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="password"
                    className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordData.password}
                      onChange={handlePasswordChange}
                      disabled={!isEditing}
                      className={`pl-10 ${theme === 'light' ? 'bg-white border-zinc-200 focus:border-zinc-300' : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'}`}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="confirmPassword"
                    className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}
                  >
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      disabled={!isEditing}
                      className={`pl-10 ${theme === 'light' ? 'bg-white border-zinc-200 focus:border-zinc-300' : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'}`}
                    />
                  </div>
                </div>
              </div>
              {isEditing && passwordError && (
                <p className="text-destructive text-sm font-medium">{passwordError}</p>
              )}
            </div>
          </div>

          {/* --- Cell 4: Account Timestamps --- */}
          <div className="space-y-6">
            <Separator className={`mt-6 ${theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-700'}`} />
            <h3
              className={`text-lg font-semibold flex items-center gap-2 mt-6 ${
                theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'
              }`}
            >
              <CalendarDays className="h-5 w-5" />
              Account Timestamps
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}>
                  Created At
                </Label>
                <Input
                  value={formatDate(userData.createdAt)}
                  disabled
                  className={`pl-4 ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700'}`}
                />
              </div>
              <div className="grid gap-2">
                <Label className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}>
                  Last Updated
                </Label>
                <Input
                  value={formatDate(userData.updatedAt)}
                  disabled
                  className={`pl-4 ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700'}`}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className={theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}>
                Last Login
              </Label>
              <Input
                value={userData.lastLoginAt ? formatDate(userData.lastLoginAt) : 'Never'}
                disabled
                className={`pl-4 ${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800/50 border-zinc-700'}`}
              />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-4 pt-6 px-4 md:px-6 lg:px-8 pb-6">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCancel}
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
          <Button onClick={handleEditClick} className="gap-2">
            <UserIcon className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
