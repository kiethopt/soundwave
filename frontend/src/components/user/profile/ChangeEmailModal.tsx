'use client';

import React, { useState } from 'react';
import { api } from '@/utils/api';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onSuccess?: () => void;
}

export function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
  onSuccess
}: ChangeEmailModalProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });
  const [errors, setErrors] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {
      newEmail: '',
      confirmEmail: '',
      currentPassword: ''
    };
    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.newEmail)) {
      newErrors.newEmail = 'Please enter a valid email address';
      isValid = false;
    }

    if (formData.newEmail === currentEmail) {
      newErrors.newEmail = 'New email cannot be the same as your current email';
      isValid = false;
    }

    if (formData.newEmail !== formData.confirmEmail) {
      newErrors.confirmEmail = 'Email addresses don\'t match';
      isValid = false;
    }

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formDataObj = new FormData();
      formDataObj.append('newEmail', formData.newEmail);
      formDataObj.append('currentPassword', formData.currentPassword);

      await api.user.editProfile(token, formDataObj);

      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      userData.email = formData.newEmail;
      localStorage.setItem('userData', JSON.stringify(userData));
      
      onOpenChange(false);
      setFormData({ newEmail: '', confirmEmail: '', currentPassword: '' });
      
      if (onSuccess) {
        onSuccess();
      }
      
      toast.success('Email updated successfully');
    } catch (error: any) {
      console.error('Failed to change email:', error);
      if (error.message === 'Incorrect password') {
        toast.error('Incorrect password');
      } else if (error.message === 'Email already in use') {
        toast.error('Email already in use');
      } else {
        toast.error('Failed to change email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${theme === 'light' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white border-white/10'}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Change Email Address
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Email (read-only) */}
          <div className="space-y-2">
            <Label
              htmlFor="current-email"
              className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
            >
              Current Email
            </Label>
            <input
              type="email"
              id="current-email"
              value={currentEmail}
              className={`w-full px-3 py-2 rounded-md cursor-not-allowed opacity-70 ${
                theme === 'light' 
                  ? 'bg-gray-100 border border-gray-300'
                  : 'bg-white/5 border border-white/10 text-white'
              }`}
              disabled
            />
          </div>

          {/* New Email */}
          <div className="space-y-2">
            <Label
              htmlFor="new-email"
              className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
            >
              New Email
            </Label>
            <input
              type="email"
              id="new-email"
              name="newEmail"
              value={formData.newEmail}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-md ${
                theme === 'light' 
                  ? 'border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500' 
                  : 'bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/30'
              } transition duration-150 ${errors.newEmail ? (theme === 'light' ? 'border-red-500' : 'border-red-500/70') : ''}`}
              required
            />
            {errors.newEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.newEmail}</p>
            )}
          </div>

          {/* Confirm New Email */}
          <div className="space-y-2">
            <Label
              htmlFor="confirm-email"
              className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
            >
              Confirm New Email
            </Label>
            <input
              type="email"
              id="confirm-email"
              name="confirmEmail"
              value={formData.confirmEmail}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-md ${
                theme === 'light' 
                  ? 'border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500' 
                  : 'bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/30'
              } transition duration-150 ${errors.confirmEmail ? (theme === 'light' ? 'border-red-500' : 'border-red-500/70') : ''}`}
              required
            />
            {errors.confirmEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmEmail}</p>
            )}
          </div>

          {/* Current Password */}
          <div className="space-y-2">
            <Label
              htmlFor="current-password"
              className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
            >
              Current Password (to verify your identity)
            </Label>
            <input
              type="password"
              id="current-password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-md ${
                theme === 'light' 
                  ? 'border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500' 
                  : 'bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/30'
              } transition duration-150 ${errors.currentPassword ? (theme === 'light' ? 'border-red-500' : 'border-red-500/70') : ''}`}
              required
            />
            {errors.currentPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-6">
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
            {isLoading ? 'Updating...' : 'Save Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}