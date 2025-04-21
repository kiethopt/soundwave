'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/utils/api';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Mail, AtSign, UserIcon } from 'lucide-react';
import { ChangeEmailModal } from '@/components/user/profile/ChangeEmailModal';
import { ChangePasswordModal } from '@/components/user/profile/ChangePasswordModal';
import toast from 'react-hot-toast';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simpleMode?: boolean;
  onSuccess?: () => void;
  userId?: string;
}

export function EditProfileModal({ 
  open, 
  onOpenChange, 
  simpleMode = false,
  onSuccess,
  userId
}: EditProfileModalProps) {
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    username: '',
    id: ''
  });
  
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onload = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        let user;
        if (userId) {
          const response = await api.user.getUserById(token, userId);
          user = response.user;
        } else {
          user = JSON.parse(localStorage.getItem('userData') || '{}');
        }

        if (user) {
          setUserData({
            name: user.name || '',
            email: user.email || '',
            username: user.username || '',
            id: user.id || ''
          });
          setAvatar(user.avatar || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      }
    };

    if (open) {
      fetchUserData();
    }
  }, [open, userId]);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formDataObj = new FormData();
      formDataObj.append('name', userData.name);
      
      if (!simpleMode) {
        formDataObj.append('email', userData.email);
        formDataObj.append('username', userData.username);
      }

      if (avatarFile) {
        formDataObj.append('avatar', avatarFile);
      }

      const response = await api.user.editProfile(token, formDataObj);

      const storedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
      const updatedUserData = { ...storedUserData, ...response };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      if (err instanceof Error) {
        toast.error(err.message || 'Failed to update profile');
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${simpleMode ? 'max-w-lg' : 'max-w-md md:max-w-xl'} ${theme === 'light' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white border-white/10'}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {simpleMode ? 'Edit Personal Profile' : 'Edit Profile'}
            </DialogTitle>
          </DialogHeader>
          
          <div className={`flex flex-col lg:flex-row ${simpleMode ? 'items-center' : 'items-start'} justify-center ${simpleMode ? '' : 'lg:justify-between'} gap-6 ${simpleMode ? '' : 'lg:gap-12'} pt-4`}>
            {/* Avatar */}
            <div className={`relative w-32 h-32 md:w-40 md:h-40 flex mx-auto ${simpleMode ? 'mx-0' : 'lg:mx-0'} justify-center group`}>
              <Image
                src={avatar || '/images/default-avatar.jpg'}
                alt="Avatar"
                width={160}
                height={160}
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

            <div className={`w-full ${simpleMode ? 'flex-1' : 'flex-1'} ${simpleMode ? 'space-y-4' : 'space-y-4'}`}>
              {/* Display Name - Always visible */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
                >
                  Display Name
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <UserIcon className={`h-5 w-5 ${theme === 'light' ? 'text-gray-400' : 'text-white/50'}`} />
                  </span>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={userData.name || ''}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    className={`w-full pl-10 px-3 py-2 rounded-md ${
                      theme === 'light' 
                        ? 'border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500' 
                        : 'bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/30'
                    } transition duration-150`}
                    required
                  />
                </div>
              </div>

              {/* Fields only shown in full mode */}
              {!simpleMode && (
                <>
                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Mail className={`h-5 w-5 ${theme === 'light' ? 'text-gray-400' : 'text-white/50'}`} />
                      </span>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={userData.email || ''}
                        className={`w-full pl-10 px-3 py-2 rounded-md cursor-not-allowed opacity-70 ${
                          theme === 'light' 
                            ? 'bg-gray-100 border border-gray-300' 
                            : 'bg-white/5 border border-white/10 text-white'
                        }`}
                        disabled
                      />
                    </div>
                    <Button 
                      onClick={() => setIsChangeEmailModalOpen(true)}
                      variant="default"
                      size="sm"
                      className="mt-1"
                    >
                      Change Email
                    </Button>
                  </div>

                  {/* Username (read-only) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
                    >
                      Username
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <AtSign className={`h-5 w-5 ${theme === 'light' ? 'text-gray-400' : 'text-white/50'}`} />
                      </span>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={userData.username || ''}
                        className={`w-full pl-10 px-3 py-2 rounded-md cursor-not-allowed opacity-70 ${
                          theme === 'light' 
                            ? 'bg-gray-100 border border-gray-300' 
                            : 'bg-white/5 border border-white/10 text-white'
                        }`}
                        disabled
                      />
                    </div>
                  </div>

                  {/* Password Change Button */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Lock className={`h-5 w-5 ${theme === 'light' ? 'text-gray-400' : 'text-white/50'}`} />
                      </span>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={'********'}
                        className={`w-full pl-10 px-3 py-2 rounded-md cursor-not-allowed opacity-70 ${
                          theme === 'light' 
                            ? 'bg-gray-100 border border-gray-300' 
                            : 'bg-white/5 border border-white/10 text-white'
                        }`}
                        disabled
                      />
                    </div>
                    <Button 
                      onClick={() => setIsChangePasswordModalOpen(true)}
                      variant="default"
                      size="sm"
                    >
                      Change Password
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant='cancel'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              variant='saveChanges'
            >
              {isLoading ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Change Modal */}
      <ChangeEmailModal 
        open={isChangeEmailModalOpen}
        onOpenChange={setIsChangeEmailModalOpen}
        currentEmail={userData.email}
        onSuccess={() => {
          const user = JSON.parse(localStorage.getItem('userData') || '{}');
          setUserData(prev => ({ ...prev, email: user.email || prev.email }));
        }}
      />

      {/* Password Change Modal */}
      <ChangePasswordModal
        open={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
      />
    </>
  );
}