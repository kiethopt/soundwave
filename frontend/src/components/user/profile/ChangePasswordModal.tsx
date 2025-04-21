'use client';

import React, { useState } from 'react';
import { api } from '@/utils/api';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangePasswordModal({
  open,
  onOpenChange,
  onSuccess
}: ChangePasswordModalProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    let isValid = true;

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      isValid = false;
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
      isValid = false;
    }

    if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'New password must be different from the current password';
      isValid = false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords don\'t match';
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
      formDataObj.append('currentPassword', formData.currentPassword);
      formDataObj.append('newPassword', formData.newPassword);
      
      await api.user.editProfile(token, formDataObj);
      
      onOpenChange(false);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      if (onSuccess) {
        onSuccess();
      }
      
      toast.success('Password updated successfully');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error.message === 'Incorrect password') {
        setErrors(prev => ({ ...prev, currentPassword: 'Incorrect password' }));
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    if (field === 'current') setShowCurrentPassword(!showCurrentPassword);
    else if (field === 'new') setShowNewPassword(!showNewPassword);
    else setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${theme === 'light' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white border-white/10'}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Change Password
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label
              htmlFor="current-password"
              className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
            >
              Current Password
            </Label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                id="current-password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 rounded-md ${
                  theme === 'light' 
                    ? 'border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500' 
                    : 'bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/30'
                } transition duration-150 ${errors.currentPassword ? (theme === 'light' ? 'border-red-500' : 'border-red-500/70') : ''}`}
                required
              />
              <button 
                type="button"
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}
                onClick={() => togglePasswordVisibility('current')}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label
              htmlFor="new-password"
              className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
            >
              New Password
            </Label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="new-password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 rounded-md ${
                  theme === 'light' 
                    ? 'border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500' 
                    : 'bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/30'
                } transition duration-150 ${errors.newPassword ? (theme === 'light' ? 'border-red-500' : 'border-red-500/70') : ''}`}
                required
              />
              <button 
                type="button"
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}
                onClick={() => togglePasswordVisibility('new')}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
            )}
            <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              Password must be at least 6 characters long.
            </p>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}
            >
              Confirm New Password
            </Label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 rounded-md ${
                  theme === 'light' 
                    ? 'border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500' 
                    : 'bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/30'
                } transition duration-150 ${errors.confirmPassword ? (theme === 'light' ? 'border-red-500' : 'border-red-500/70') : ''}`}
                required
              />
              <button 
                type="button"
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
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
            {isLoading ? 'Updating...' : 'Save Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}