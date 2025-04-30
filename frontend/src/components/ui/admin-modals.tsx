import React, { useState, useEffect, useRef } from 'react';
import { Genre, User, Label } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { XIcon, Trash2, ShieldAlert, UserCog, Eye, EyeOff, XCircle, CheckCircle, Plus, AlbumIcon, ShieldCheck, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { UserIcon } from 'lucide-react';
import { Edit, Spinner } from './Icons';
import Image from 'next/image';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Music } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDominantColor } from '@/hooks/useDominantColor';
import { Album, Track } from '@/types';
import { Calendar } from 'lucide-react';
import { ArtistProfile } from '@/types';
import { Separator } from '@/components/ui/separator';

// Edit User Modal
interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditUserModal({
  user,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: EditUserModalProps) {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [showDeactivateSection, setShowDeactivateSection] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const predefinedReasons = [
    "Violation of terms of service",
    "Inappropriate content or behavior",
    "Account inactivity",
    "Security concerns",
    "User requested deactivation",
    "Other (specify below)",
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        isActive: user.isActive
      });
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsDeactivating(false);
      setDeactivationReason('');
      setShowDeactivateSection(false);
      setIsActivating(false);
    } else {
      setFormData({});
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsDeactivating(false);
      setDeactivationReason('');
      setShowDeactivateSection(false);
      setIsActivating(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) {
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReasonClick = (reason: string) => {
    setDeactivationReason(reason);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword && newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    const dataToSend = new FormData();
    let hasChanges = false;

    // Append basic info if changed
    if (formData.name !== undefined && formData.name !== user.name) { dataToSend.append('name', formData.name); hasChanges = true; }
    if (formData.username !== undefined && formData.username !== user.username) { dataToSend.append('username', formData.username); hasChanges = true; }
    if (formData.email !== undefined && formData.email !== user.email) { dataToSend.append('email', formData.email); hasChanges = true; }
    if (newPassword) {
      dataToSend.append('newPassword', newPassword);
      hasChanges = true;
    }
    
    // Handle activation
    if (isActivating && !user.isActive) {
      dataToSend.append('isActive', 'true');
      hasChanges = true;
    }
    // Handle deactivation (only if not activating)
    else if (isDeactivating && user.isActive) {
      if (!deactivationReason.trim()) {
        toast.error("Please provide a reason for deactivation.");
        return;
      }
      dataToSend.append('isActive', 'false');
      dataToSend.append('reason', deactivationReason);
      hasChanges = true;
    }

    if (hasChanges) {
      await onSubmit(user.id, dataToSend);
    } else {
      toast('No changes detected.', { icon: 'ℹ️' });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <UserIcon className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Edit User
                </DialogTitle>
                <DialogDescription className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Update user information or status
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id="edit-user-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div className="space-y-2">
              <UILabel htmlFor="name" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Full Name
              </UILabel>
              <Input
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter full name"
                disabled={isActivating || isDeactivating}
              />
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="username" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Username
              </UILabel>
              <Input
                id="username"
                name="username"
                value={formData.username || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter username"
                disabled={isActivating || isDeactivating}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <UILabel htmlFor="email" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Email Address
              </UILabel>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter email address"
                disabled={isActivating || isDeactivating}
              />
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="newPassword" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                New Password (optional)
              </UILabel>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(
                    "w-full pr-10",
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  )}
                  placeholder="Enter new password"
                  disabled={isActivating || isDeactivating}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isActivating || isDeactivating}
                >
                  {showNewPassword ? (
                    <Eye className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="confirmNewPassword" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Confirm New Password
              </UILabel>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={cn(
                    "w-full pr-10",
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  )}
                  placeholder="Confirm new password"
                  disabled={isActivating || isDeactivating}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isActivating || isDeactivating}
                >
                  {showConfirmPassword ? (
                    <Eye className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Status Section */}
            <div className="col-span-2 mt-4">
              <Separator className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} />
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user.isActive ? (
                      <ShieldCheck className={cn(
                        "h-5 w-5",
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      )} />
                    ) : (
                      <ShieldAlert className={cn(
                        "h-5 w-5",
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      )} />
                    )}
                    <span className={cn(
                      "font-medium",
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>
                      Account Status: {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {/* Activate Button */}
                  {!user.isActive && (
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsActivating(true);
                        setShowDeactivateSection(false);
                        setIsDeactivating(false);
                      }}
                      className={cn(
                        "text-xs",
                        theme === 'dark' 
                          ? 'border-green-700 text-green-300 hover:bg-green-600/20' 
                          : 'border-green-600 text-green-700 hover:bg-green-50',
                         isActivating ? (theme === 'dark' ? 'bg-green-700/30' : 'bg-green-100') : ''
                      )}
                    >
                      {isActivating ? <Spinner className="h-4 w-4 mr-1 animate-spin"/> : <ShieldCheck className="h-4 w-4 mr-1" />} 
                      Activate Account
                    </Button>
                  )}

                  {/* Deactivate Button */}
                  {user.isActive && (
                    <Button 
                      type="button"
                      variant={showDeactivateSection ? "outline" : "destructive"}
                      size="sm"
                      onClick={() => {
                        const nextShowState = !showDeactivateSection;
                        setShowDeactivateSection(nextShowState);
                        setIsDeactivating(nextShowState);
                        if (!nextShowState) setDeactivationReason('');
                      }}
                      className={cn(
                        "text-xs",
                        showDeactivateSection 
                          ? (theme === 'dark' ? 'border-gray-600' : 'border-gray-300') 
                          : (theme === 'dark' ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700 text-white')
                      )}
                    >
                      {showDeactivateSection ? 'Cancel Deactivation' : 'Deactivate Account'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Deactivation reason */}
            {showDeactivateSection && user.isActive && (
              <div className="col-span-2 space-y-4 mt-2">
                <div className="flex flex-wrap gap-2 mb-3">
                  {predefinedReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => handleReasonClick(reason)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        deactivationReason === reason
                          ? theme === 'dark'
                            ? 'bg-orange-900 text-orange-100'
                            : 'bg-orange-100 text-orange-800'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <UILabel 
                    htmlFor="deactivationReason" 
                    className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                  >
                    Deactivation Reason
                  </UILabel>
                  <Textarea
                    id="deactivationReason"
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    placeholder="Enter reason for deactivation..."
                    className={cn(
                      "resize-none min-h-[100px]",
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={theme === 'dark' ? 'border-gray-600 text-white hover:bg-gray-700' : ''}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                theme === 'dark' ? 'bg-neutral-900 hover:bg-neutral-900/90' : 'bg-neutral-900 hover:bg-neutral-900/90 text-white',
                (isActivating || isDeactivating) && (theme === 'dark' ? 'opacity-70' : 'opacity-80') // Style when activating/deactivating
              )}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Artist Modal
interface EditArtistModalProps {
  artist: ArtistProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (artistId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditArtistModal({
  artist,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: EditArtistModalProps) {
  const [formData, setFormData] = useState<Partial<ArtistProfile>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [showDeactivateSection, setShowDeactivateSection] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const predefinedReasons = [
    "Violation of terms of service",
    "Inappropriate content or behavior",
    "Account inactivity",
    "Security concerns",
    "Artist requested deactivation",
    "Other (specify below)",
  ];

  useEffect(() => {
    if (artist) {
      setFormData({
        artistName: artist.artistName || '',
        bio: artist.bio || '',
        isActive: artist.isActive, // Include isActive state
      });
      // Reset state related to activation/deactivation
      setIsDeactivating(false);
      setDeactivationReason('');
      setShowDeactivateSection(false);
      setIsActivating(false);
    } else {
      setFormData({});
       // Reset state related to activation/deactivation
      setIsDeactivating(false);
      setDeactivationReason('');
      setShowDeactivateSection(false);
      setIsActivating(false);
    }
  }, [artist, isOpen]);

  if (!isOpen || !artist) {
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReasonClick = (reason: string) => {
    setDeactivationReason(reason);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist) return;

    const dataToSend = new FormData();
    let hasChanges = false;

    // Append basic info if changed
    if (formData.artistName !== undefined && formData.artistName !== artist.artistName) { dataToSend.append('artistName', formData.artistName); hasChanges = true; }
    if (formData.bio !== undefined && formData.bio !== artist.bio) { dataToSend.append('bio', formData.bio); hasChanges = true; }

    // Handle activation
    if (isActivating && !artist.isActive) {
      dataToSend.append('isActive', 'true');
      hasChanges = true;
    }
    // Handle deactivation (only if not activating)
    else if (isDeactivating && artist.isActive) {
      if (!deactivationReason.trim()) {
        toast.error("Please provide a reason for deactivation.");
        return;
      }
      dataToSend.append('isActive', 'false');
      dataToSend.append('reason', deactivationReason);
      hasChanges = true;
    }

    if (hasChanges) {
      setIsUploading(true); // Use isUploading state for loading indicator
      try {
        await onSubmit(artist.id, dataToSend);
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update artist');
      } finally {
        setIsUploading(false);
      }
    } else {
      toast('No changes detected.', { icon: 'ℹ️' });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <Music className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Edit Artist
                </DialogTitle>
                <DialogDescription className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Update artist information
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id="edit-artist-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 gap-x-4 gap-y-4">
            {/* Artist Name */}
            <div className="space-y-2">
              <UILabel htmlFor="artistName" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Artist Name
              </UILabel>
              <Input
                id="artistName"
                name="artistName"
                value={formData.artistName || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter artist name"
                disabled={isActivating || isDeactivating || isUploading}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <UILabel htmlFor="bio" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Biography
              </UILabel>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full min-h-[100px]",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter artist biography"
                disabled={isActivating || isDeactivating || isUploading}
              />
            </div>

            {/* Status Section */}
            <div className="col-span-1 mt-4">
              <Separator className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} />
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {artist.isActive ? (
                      <ShieldCheck className={cn(
                        "h-5 w-5",
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      )} />
                    ) : (
                      <ShieldAlert className={cn(
                        "h-5 w-5",
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      )} />
                    )}
                    <span className={cn(
                      "font-medium",
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>
                      Artist Status: {artist.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {/* Activate Button */}
                  {!artist.isActive && (
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsActivating(true);
                        setShowDeactivateSection(false);
                        setIsDeactivating(false);
                      }}
                      className={cn(
                        "text-xs",
                        theme === 'dark' 
                          ? 'border-green-700 text-green-300 hover:bg-green-600/20' 
                          : 'border-green-600 text-green-700 hover:bg-green-50',
                         isActivating ? (theme === 'dark' ? 'bg-green-700/30' : 'bg-green-100') : ''
                      )}
                      disabled={isUploading}
                    >
                      {isActivating ? <Spinner className="h-4 w-4 mr-1 animate-spin"/> : <ShieldCheck className="h-4 w-4 mr-1" />} 
                      Activate Artist
                    </Button>
                  )}

                  {/* Deactivate Button */}
                  {artist.isActive && (
                    <Button 
                      type="button"
                      variant={showDeactivateSection ? "outline" : "destructive"}
                      size="sm"
                      onClick={() => {
                        const nextShowState = !showDeactivateSection;
                        setShowDeactivateSection(nextShowState);
                        setIsDeactivating(nextShowState);
                        if (!nextShowState) setDeactivationReason(''); // Clear reason on cancel
                      }}
                      className={cn(
                        "text-xs",
                        showDeactivateSection 
                          ? (theme === 'dark' ? 'border-gray-600' : 'border-gray-300') 
                          : (theme === 'dark' ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700 text-white')
                      )}
                      disabled={isUploading}
                    >
                      {showDeactivateSection ? 'Cancel Deactivation' : 'Deactivate Artist'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Deactivation reason */}
            {showDeactivateSection && artist.isActive && (
              <div className="col-span-1 space-y-4 mt-2">
                <div className="flex flex-wrap gap-2 mb-3">
                  {predefinedReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => handleReasonClick(reason)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        deactivationReason === reason
                          ? theme === 'dark'
                            ? 'bg-orange-900 text-orange-100'
                            : 'bg-orange-100 text-orange-800'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                      disabled={isUploading}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <UILabel 
                    htmlFor="deactivationReasonArtist" 
                    className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                  >
                    Deactivation Reason
                  </UILabel>
                  <Textarea
                    id="deactivationReasonArtist"
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    placeholder="Enter reason for deactivation..."
                    className={cn(
                      "resize-none min-h-[100px]",
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    )}
                    disabled={isUploading}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "flex items-center justify-end gap-3 px-6 py-4 border-t",
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-artist-form"
            disabled={isUploading}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90',
               (isActivating || isDeactivating) && (theme === 'dark' ? 'opacity-70' : 'opacity-80') // Style when changing status
            )}
          >
            {isUploading ? (isActivating ? 'Activating...' : isDeactivating ? 'Deactivating...' : 'Saving...') : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Action Reason Modal (Generic)
interface ActionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  actionText: string;
  theme?: "light" | "dark";
  predefinedReasons?: string[];
  placeholderText?: string;
  actionIcon?: React.ReactNode;
  actionVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  confirmDisabled?: boolean;
}

export function ActionReasonModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionText,
  theme = "light",
  predefinedReasons = [],
  placeholderText = "Please provide a reason...",
  actionIcon,
  actionVariant = "destructive",
  confirmDisabled: externalConfirmDisabled = false,
}: ActionReasonModalProps) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setCustomReason(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    onConfirm(reason);
  };

  const handlePredefinedClick = (preReason: string) => {
    if (preReason === "Other (specify below)") {
      setReason("");
      setCustomReason(true);
    } else {
      setReason(preReason);
      setCustomReason(false);
    }
  };

  const isConfirmDisabled = externalConfirmDisabled || !reason.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-[450px] ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'}`}
      >
        <DialogHeader>
          <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>
            {title}
          </DialogTitle>
          <DialogDescription className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {predefinedReasons.length > 0 && (
            <div className="space-y-2">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Select a reason:
              </p>
              <div className="flex flex-wrap gap-2">
                {predefinedReasons.map((preReason) => (
                  <Button
                    key={preReason}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePredefinedClick(preReason)}
                    className={`${theme === 'dark' ? 'text-white border-gray-600 hover:bg-gray-700' : ''} ${reason === preReason && !customReason ? (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200') : ''}`}
                  >
                    {preReason}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(customReason || predefinedReasons.length === 0) && (
            <div className="space-y-1">
              <UILabel
                htmlFor="actionReason"
                className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Reason (Required)
              </UILabel>
              <Textarea
                id="actionReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={placeholderText}
                className={`min-h-[80px] w-full rounded-md border p-2 text-sm ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className={theme === 'dark' ? 'text-white border-gray-600 hover:bg-gray-700' : ''}
          >
            Cancel
          </Button>
          <Button
            variant={actionVariant}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={theme === 'dark' && actionVariant === 'destructive' ? 'bg-red-700 hover:bg-red-600 text-white' : ''}
          >
            {actionIcon && <span className="mr-2">{actionIcon}</span>}
            {actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Deactivate Modal
interface DeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  theme?: "light" | "dark";
  entityType?: "user" | "artist";
}

export function DeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  theme = "light",
  entityType = "user",
}: DeactivateModalProps) {
  const title = `Deactivate ${entityType === "user" ? "User" : "Artist"}`;
  const description = `Please provide a reason for deactivating this ${entityType}. This reason may be communicated to the ${entityType}.`;
  const placeholderText = `Enter reason for deactivating ${entityType}...`;

  const predefinedReasons = [
    "Violation of terms of service",
    "Inappropriate content or behavior",
    "Account inactivity",
    "Security concerns",
    "User requested deactivation",
    "Other (specify below)",
  ];

  return (
    <ActionReasonModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      actionText="Deactivate"
      theme={theme}
      predefinedReasons={predefinedReasons}
      placeholderText={placeholderText}
      actionIcon={<ShieldAlert className="h-4 w-4" />}
      actionVariant="destructive"
    />
  );
}

// Confirm Delete Modal
interface ConfirmDeleteModalProps {
  item: { id: string; name?: string | null; email: string } | null;
  count?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  theme?: 'light' | 'dark';
  entityType?: string;
}

export function ConfirmDeleteModal({
  item,
  count,
  isOpen,
  onClose,
  onConfirm,
  theme = 'light',
  entityType = 'item',
}: ConfirmDeleteModalProps) {

  if (!isOpen || (!item && !count)) {
    return null;
  }

  const isBulkDelete = count !== undefined && count > 0;
  const title = isBulkDelete ? `Delete ${count} ${entityType}(s)` : `Delete ${entityType}`;
  const itemName = item?.name || item?.email;
  const description = isBulkDelete
    ? `Are you sure you want to delete the selected ${count} ${entityType}(s)? This action cannot be undone.`
    : `Are you sure you want to delete the ${entityType} ${itemName ? `"${itemName}"` : 'this item'}? This action cannot be undone.`;

  const handleConfirm = () => {
    if (isBulkDelete && count) {
      onConfirm([]);
    } else if (item) {
      onConfirm([item.id]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`
          sm:max-w-[400px] p-0 overflow-hidden
          ${theme === 'dark'
            ? 'bg-gray-800 text-white border-gray-700'
            : 'bg-white'}
        `}
      >
        {/* ---------- Header ---------- */}
        <div className="px-6 pt-6">
          {/* Header with Trash icon and Close button aligned */}
          <div className="flex items-center justify-between w-full">
            {/* Trash icon */}
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100">
              <Trash2 className="w-7 h-7 text-red-600" strokeWidth={1.5} />
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`
                w-8 h-8 rounded-md flex items-center justify-center transition-colors
                ${theme === 'dark'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-black/5'}
              `}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ---------- Title & Description ---------- */}
          <DialogTitle
            className={`
              mt-4 text-lg font-bold text-left
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}
          >
            {title}
          </DialogTitle>
          <p
            className={`
              mt-1 text-sm text-left
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}
          >
            {description}
          </p>
        </div>

        {/* ---------- Actions ---------- */}
        <div className={`
          mt-6 px-6 py-4 flex gap-3 border-t
          ${theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'}
        `}>
          <Button
            variant="outline"
            className={`flex-1 text-center justify-center bg-white
              ${theme === 'dark' 
                ? 'text-gray-900 hover:bg-gray-100 border-gray-300' 
                : 'hover:bg-gray-50 border-gray-300'}`}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className={`flex-1 text-center justify-center ${theme === 'dark' ? 'bg-red-700 hover:bg-red-600' : ''}`}
            onClick={handleConfirm}
          >
            Delete {isBulkDelete ? `${count} ${entityType}(s)` : entityType}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Make Admin Confirmation Modal
interface MakeAdminModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void; // Accepts userId
  theme?: 'light' | 'dark';
  adminLevelToSet?: number;
}

export function MakeAdminModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  theme = 'light',
  adminLevelToSet = 2, // Default to Level 2
}: MakeAdminModalProps) {

  if (!isOpen || !user) {
    return null;
  }

  const title = `Make Admin (Level ${adminLevelToSet})`;
  const userName = user?.name || user?.email;
  const description = `Are you sure you want to grant Admin (Level ${adminLevelToSet}) privileges to ${userName ? `"${userName}"` : 'this user'}? They will gain access to administrative functions.`;

  const handleConfirm = () => {
    if (user) {
      onConfirm(user.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`
          sm:max-w-[400px] p-0 overflow-hidden
          ${theme === 'dark'
            ? 'bg-gray-800 text-white border-gray-700'
            : 'bg-white'}
        `}
      >
        {/* ---------- Header ---------- */}
        <div className="px-6 pt-6">
          {/* Header with Icon and Close button */}
          <div className="flex items-center justify-between w-full">
            {/* Icon */}
            <div className={`w-12 h-12 flex items-center justify-center rounded-full ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
              <UserCog className={`w-7 h-7 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} strokeWidth={1.5} />
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`
                w-8 h-8 rounded-md flex items-center justify-center transition-colors
                ${theme === 'dark'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-black/5'}
              `}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ---------- Title & Description ---------- */}
          <DialogTitle
            className={`
              mt-4 text-lg font-bold text-left
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}
          >
            {title}
          </DialogTitle>
          <DialogDescription
            className={`
              mt-1 text-sm text-left
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}
          >
            {description}
          </DialogDescription>
        </div>

        {/* ---------- Actions ---------- */}
        <div className={`
          mt-6 px-6 py-4 flex gap-3 border-t
          ${theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'}
        `}>
          <Button
            variant="outline"
            className={`flex-1 text-center justify-center ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="default" // Use default variant for confirmation
            className={`flex-1 text-center justify-center ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-900 hover:bg-neutral-900/90'}`}
            onClick={handleConfirm}
          >
             Confirm Make Admin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Reject Modal
interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  theme?: "light" | "dark";
}

export function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  theme = "light",
}: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setCustomReason(false);
    }
  }, [isOpen]);

  const predefinedReasons = [
    "Incomplete information provided",
    "Invalid artist credentials",
    "Inappropriate content or behavior",
    "Duplicate request",
    "Not meeting platform requirements",
    "Other (specify below)",
  ];

  const handlePredefinedClick = (preReason: string) => {
    if (preReason === "Other (specify below)") {
      setReason("");
      setCustomReason(true);
    } else {
      setReason(preReason);
      setCustomReason(false);
    }
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    onConfirm(reason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`
          sm:max-w-[450px] p-0 overflow-hidden
          ${theme === 'dark'
            ? 'bg-gray-800 text-white border-gray-700'
            : 'bg-white'}
        `}
      >
        {/* ---------- Header ---------- */}
        <div className="px-6 pt-6">
          {/* Header with X icon and Close button aligned */}
          <div className="flex items-center justify-between w-full">
            {/* X icon */}
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100">
              <XCircle className="w-7 h-7 text-red-600" strokeWidth={1.5} />
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`
                w-8 h-8 rounded-md flex items-center justify-center transition-colors
                ${theme === 'dark'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-black/5'}
              `}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ---------- Title & Description ---------- */}
          <DialogTitle
            className={`
              mt-4 text-lg font-bold text-left
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}
          >
            Reject Artist Request
          </DialogTitle>
          <p
            className={`
              mt-1 text-sm text-left
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}
          >
            Please provide a reason for rejecting this artist request. This reason may be communicated to the user.
          </p>
        </div>

        {/* ---------- Selection & Input ---------- */}
        <div className="px-6 py-4">
          {predefinedReasons.length > 0 && (
            <div className="space-y-2">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Select a reason:
              </p>
              <div className="flex flex-wrap gap-2">
                {predefinedReasons.map((preReason) => (
                  <Button
                    key={preReason}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePredefinedClick(preReason)}
                    className={`${theme === 'dark' ? 'text-white border-gray-600 hover:bg-gray-700' : ''} ${reason === preReason && !customReason ? (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200') : ''}`}
                  >
                    {preReason}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(customReason || predefinedReasons.length === 0) && (
            <div className="space-y-1 mt-4">
              <UILabel
                htmlFor="rejectReason"
                className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Reason (Required)
              </UILabel>
              <Textarea
                id="rejectReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className={`min-h-[80px] w-full rounded-md border p-2 text-sm ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
            </div>
          )}
        </div>

        {/* ---------- Actions ---------- */}
        <div className={`
          px-6 py-4 flex gap-3 border-t
          ${theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'}
        `}>
          <Button
            variant="outline"
            className={`flex-1 text-center justify-center ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-300'}`}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className={`flex-1 text-center justify-center ${theme === 'dark' ? 'bg-red-700 hover:bg-red-600' : ''}`}
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject Artist Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Approve Modal
interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  theme?: "light" | "dark";
  artistName?: string;
}

export function ApproveModal({
  isOpen,
  onClose,
  onConfirm,
  theme = "light",
  artistName,
}: ApproveModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`
          sm:max-w-[450px] p-0 overflow-hidden
          ${theme === 'dark'
            ? 'bg-gray-800 text-white border-gray-700'
            : 'bg-white'}
        `}
      >
        {/* ---------- Header ---------- */}
        <div className="px-6 pt-6">
          {/* Header with Check icon and Close button aligned */}
          <div className="flex items-center justify-between w-full">
            {/* Check icon */}
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="w-7 h-7 text-green-600" strokeWidth={1.5} />
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`
                w-8 h-8 rounded-md flex items-center justify-center transition-colors
                ${theme === 'dark'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-black/5'}
              `}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ---------- Title & Description ---------- */}
          <DialogTitle
            className={`
              mt-4 text-lg font-bold text-left
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}
          >
            Approve Artist Request
          </DialogTitle>
          <p
            className={`
              mt-1 text-sm text-left
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}
          >
            {artistName 
              ? `Are you sure you want to approve "${artistName}"? This action will grant artist status to the user.`
              : `Are you sure you want to approve this artist request? This action will grant artist status to the user.`}
          </p>
        </div>

        {/* ---------- Actions ---------- */}
        <div className={`
          mt-6 px-6 py-4 flex gap-3 border-t
          ${theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'}
        `}>
          <Button
            variant="outline"
            className={`flex-1 text-center justify-center ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-300'}`}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className={`flex-1 text-center justify-center ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            onClick={onConfirm}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve Artist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add Genre Modal
interface AddGenreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  theme?: "light" | "dark";
}

export function AddGenreModal({
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: AddGenreModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <Tags className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Add New Genre
                </DialogTitle>
                <p className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Create a new music genre category
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id="add-genre-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="space-y-4">
            <div className="space-y-2">
              <UILabel htmlFor="genre-name" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Genre Name
              </UILabel>
              <Input
                id="genre-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter genre name"
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                maxLength={50}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-genre-form"
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
            disabled={isSubmitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Genre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Genre Modal
interface EditGenreModalProps {
  genre: Genre | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (genreId: string, name: string) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditGenreModal({
  genre,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: EditGenreModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && genre) {
      setName(genre.name);
      setIsSubmitting(false);
    }
  }, [isOpen, genre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genre || !name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(genre.id, name.trim());
    } catch (error) {
      // Handle ở parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !genre) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
              )}>
                <Edit className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-amber-300' : 'text-amber-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Edit Genre
                </DialogTitle>
                <p className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Update genre information
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id="edit-genre-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="space-y-4">
            <div className="space-y-2">
              <UILabel htmlFor="edit-genre-name" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Genre Name
              </UILabel>
              <Input
                id="edit-genre-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter genre name"
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                maxLength={50}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-genre-form"
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add Label Modal
interface AddLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function AddLabelModal({
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: AddLabelModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setLogoFile(null);
      setPreviewLogo("");
      formRef.current?.reset();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setPreviewLogo(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleLogoClick = () => {
    document.getElementById("newLogoFile")?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!formData.get("name")?.toString().trim()) {
      toast.error("Label name is required.");
      return;
    }

    if (logoFile) {
      formData.set("logoFile", logoFile);
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose(); // Close modal on success
    } catch (error) {
      // Error handled by the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <Tags className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Add New Label
                </DialogTitle>
                <p className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Create a new record label
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} id="add-label-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow space-y-4">
           <div className="flex flex-col items-center space-y-3">
             <UILabel
               htmlFor="newLogoFile"
               className={`w-28 h-28 rounded-full overflow-hidden cursor-pointer border-2 flex items-center justify-center ${theme === 'dark' ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
             >
               {previewLogo ? (
                 <Image
                   src={previewLogo}
                   alt="Label Logo Preview"
                   width={112}
                   height={112}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <div className="flex flex-col items-center justify-center text-center">
                   <Tags className={`w-8 h-8 mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                   <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Upload Logo</span>
                 </div>
               )}
             </UILabel>
             <input
               type="file"
               id="newLogoFile"
               accept="image/*"
               onChange={handleFileChange}
               className="hidden"
             />
           </div>

           <div className="space-y-2">
             <UILabel htmlFor="add-label-name" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
               Label Name
             </UILabel>
             <Input
               id="add-label-name"
               name="name"
               placeholder="Enter label name"
               className={cn(
                 "w-full",
                 theme === 'dark' 
                   ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                   : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
               )}
               maxLength={100}
               required
               disabled={isSubmitting}
             />
           </div>

            <div className="space-y-2">
              <UILabel htmlFor="add-label-description" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Description
              </UILabel>
              <Textarea
                id="add-label-description"
                name="description"
                placeholder="Enter label description (optional)"
                className={cn(
                  "w-full min-h-[80px]",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                maxLength={500}
                disabled={isSubmitting}
              />
            </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-label-form"
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
            disabled={isSubmitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Label Modal
interface EditLabelModalProps {
  label: Label | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (labelId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditLabelModal({
  label,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: EditLabelModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null | undefined>(
    label?.logoUrl
  );

  useEffect(() => {
    if (isOpen && label) {
      setPreviewLogo(label.logoUrl);
      setLogoFile(null);
      if (formRef.current) {
         const nameInput = formRef.current.elements.namedItem('name') as HTMLInputElement;
         const descriptionInput = formRef.current.elements.namedItem('description') as HTMLTextAreaElement;
         if (nameInput) nameInput.value = label.name;
         if (descriptionInput) descriptionInput.value = label.description || '';
      }
      setIsSubmitting(false);
    } else if (!isOpen) {
        setPreviewLogo(null);
        setLogoFile(null);
    }
  }, [isOpen, label]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setPreviewLogo(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleLogoClick = () => {
    document.getElementById("editLogoFile")?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!label) return;

    const formData = new FormData(e.currentTarget);
    if (!formData.get("name")?.toString().trim()) {
      toast.error("Label name is required.");
      return;
    }

    // Chỉ thêm file nếu có file mới được chọn
    if (logoFile) {
      formData.set("logoFile", logoFile);
    } else {
      // Nếu ko có file mới được chọn, đảm bảo trường logoFile ko được gửi
      formData.delete("logoFile");
    }

    setIsSubmitting(true);
    try {
      await onSubmit(label.id, formData);
      onClose();
    } catch (error) {
      // Xử lý trong parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !label) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
              )}>
                <Edit className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-amber-300' : 'text-amber-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Edit Label
                </DialogTitle>
                <p className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Update label information
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} id="edit-label-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow space-y-4">
           <div className="flex flex-col items-center space-y-3">
             <UILabel
               htmlFor="editLogoFile"
               className={`w-28 h-28 rounded-full overflow-hidden cursor-pointer border-2 flex items-center justify-center ${theme === 'dark' ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
             >
               {previewLogo ? (
                 <Image
                   src={previewLogo}
                   alt="Label Logo Preview"
                   width={112}
                   height={112}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <div className="flex flex-col items-center justify-center text-center">
                   <Tags className={`w-8 h-8 mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                   <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Upload Logo</span>
                 </div>
               )}
             </UILabel>
             <input
               type="file"
               id="editLogoFile"
               name="logoFile"
               accept="image/*"
               onChange={handleFileChange}
               className="hidden"
             />
           </div>

           <div className="space-y-2">
             <UILabel htmlFor="edit-label-name" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
               Label Name
             </UILabel>
             <Input
               id="edit-label-name"
               name="name"
               defaultValue={label.name}
               placeholder="Enter label name"
               className={cn(
                 "w-full",
                 theme === 'dark' 
                   ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                   : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
               )}
               maxLength={100}
               required
               disabled={isSubmitting}
             />
           </div>

            <div className="space-y-2">
              <UILabel htmlFor="edit-label-description" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Description
              </UILabel>
              <Textarea
                id="edit-label-description"
                name="description"
                defaultValue={label.description || ''}
                placeholder="Enter label description (optional)"
                className={cn(
                  "w-full min-h-[80px]",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                maxLength={500}
                disabled={isSubmitting}
              />
            </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-label-form"
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// System Playlist Modal
interface SystemPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: {
    id?: string;
    name?: string;
    description?: string;
    coverUrl?: string;
    privacy?: "PUBLIC" | "PRIVATE";
    basedOnMood?: string;
    basedOnGenre?: string;
    basedOnArtist?: string;
    basedOnSongLength?: string;
    basedOnReleaseTime?: string;
    trackCount?: number;
  };
  theme?: "light" | "dark";
  mode: "create" | "edit";
}

export function SystemPlaylistModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  theme = "light",
  mode = "create",
}: SystemPlaylistModalProps) {
  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE">(
    initialData.privacy || "PUBLIC"
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialData.coverUrl || null
  );

  // AI generation parameters - Initialize from initialData
  const [isAIGenerated, setIsAIGenerated] = useState(true);
  const [basedOnMood, setBasedOnMood] = useState(initialData.basedOnMood || "");
  const [basedOnGenre, setBasedOnGenre] = useState(
    initialData.basedOnGenre || ""
  );
  const [basedOnArtist, setBasedOnArtist] = useState(
    initialData.basedOnArtist || ""
  );
  const [basedOnSongLength, setBasedOnSongLength] = useState(
    initialData.basedOnSongLength || ""
  );
  const [basedOnReleaseTime, setBasedOnReleaseTime] = useState(
    initialData.basedOnReleaseTime || ""
  );
  const [trackCount, setTrackCount] = useState(initialData.trackCount || 10);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();

    // Basic playlist data
    formData.append("name", name);
    if (description) formData.append("description", description);
    formData.append("privacy", privacy);

    // If we're editing an existing playlist, include the ID
    if (mode === "edit" && initialData.id) {
      formData.append("id", initialData.id);
    }

    // Include the cover file if one was selected
    if (coverFile) {
      formData.append("cover", coverFile);
    }

    // AI generation parameters
    formData.append("isAIGenerated", String(isAIGenerated));
    if (isAIGenerated) {
      if (basedOnMood) formData.append("basedOnMood", basedOnMood);
      if (basedOnGenre) formData.append("basedOnGenre", basedOnGenre);
      if (basedOnArtist) formData.append("basedOnArtist", basedOnArtist);
      if (basedOnSongLength)
        formData.append("basedOnSongLength", basedOnSongLength);
      if (basedOnReleaseTime)
        formData.append("basedOnReleaseTime", basedOnReleaseTime);
      formData.append("trackCount", String(trackCount));
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting playlist:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-5xl w-[95vw] h-[85vh] flex flex-col ${
          // Thay max-h-[90vh] bằng h-[85vh]
          theme === "dark"
            ? "bg-[#1e1e1e] text-white border-white/10"
            : "bg-white"
        }`}
      >
        <DialogHeader className="flex-shrink-0">
          {" "}
          {/* Header không co lại */}
          <DialogTitle
            className={theme === "dark" ? "text-white" : "text-gray-900"}
          >
            {mode === "create"
              ? "Create System Playlist"
              : "Edit System Playlist"}
          </DialogTitle>
          <DialogDescription
            className={theme === "dark" ? "text-white/70" : "text-gray-500"}
          >
            {mode === "create"
              ? "Create a new system playlist as a template for user playlists"
              : "Edit the system playlist details"}
          </DialogDescription>
        </DialogHeader>

        {/* Khu vực nội dung chính có thể scroll nội bộ */}
        <div className="flex-grow overflow-y-hidden pt-4">
          {/* Cho phép khu vực này giãn nở, ẩn scrollbar chính */}
          <form
            onSubmit={handleSubmit}
            id="system-playlist-form"
            className="h-full flex flex-col"
          >
            {/* Form chiếm hết chiều cao khu vực giữa */}
            <Tabs
              defaultValue="basic"
              className="w-full flex flex-col flex-grow"
            >
              {/* Tabs chiếm không gian còn lại */}
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                {/* TabsList không co lại */}
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="ai">AI Options</TabsTrigger>
              </TabsList>
              {/* Wrapper cuộn nội bộ cho TabsContent */}
              <div className="flex-grow overflow-y-auto pr-3 mt-6">
                {/* Phần này sẽ cuộn, không cần chiều cao cố định */}
                {/* Nội dung tab Basic Information */}
                <TabsContent value="basic" className="mt-0">
                  <div className="space-y-6">
                    {/* Container cho nội dung */}
                    {/* Giữ lại grid nội bộ cho cover và các trường input cơ bản */}
                    <div className="grid grid-cols-4 gap-4">
                      {/* Cover Image */}
                      <div className="col-span-1">
                        <UILabel
                          className={`mb-1 block text-sm font-medium ${
                            theme === "dark" ? "text-white/80" : ""
                          }`}
                        >
                          Cover
                        </UILabel>
                        <div
                          onClick={handleCoverClick}
                          className={`w-full aspect-square rounded-md ${
                            theme === "dark"
                              ? "bg-white/5 hover:bg-white/10"
                              : "bg-gray-100 hover:bg-gray-200"
                          } flex items-center justify-center cursor-pointer overflow-hidden transition-colors`}
                        >
                          {coverPreview ? (
                            <Image
                              src={coverPreview}
                              alt="Playlist cover"
                              width={100}
                              height={100}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <p
                          className={`text-xs mt-1 text-center ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Click to upload
                        </p>
                      </div>
                      {/* Fields: Name, Description, Privacy */}
                      <div className="col-span-3">
                        {" "}
                        {/* Giảm gap thành space-y-3 */}
                        <div>
                          <UILabel
                            htmlFor="name"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Playlist Name*
                          </UILabel>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Top Hits of 2023"
                            required
                            maxLength={50} // Thêm giới hạn ký tự
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                          {/* Bộ đếm ký tự cho Title */}
                          <p
                            className={`text-xs text-right mt-1 ${
                              theme === "dark"
                                ? "text-white/50"
                                : "text-gray-500"
                            }`}
                          >
                            {name.length} / 50
                          </p>
                        </div>
                        <div>
                          <UILabel
                            htmlFor="description"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Description
                          </UILabel>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the playlist..."
                            maxLength={300} // Thêm giới hạn ký tự
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                            rows={4}
                          />
                          {/* Bộ đếm ký tự cho Description */}
                          <p
                            className={`text-xs text-right mt-1 ${
                              theme === "dark"
                                ? "text-white/50"
                                : "text-gray-500"
                            }`}
                          >
                            {description.length} / 300
                          </p>
                        </div>
                        <div>
                          <UILabel
                            htmlFor="privacy"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Privacy
                          </UILabel>
                          <Select
                            value={privacy}
                            onValueChange={(
                              value: "PUBLIC" | "PRIVATE"
                            ) => setPrivacy(value)}
                          >
                            <SelectTrigger
                              className={
                                theme === "dark"
                                  ? "bg-white/[0.07] text-white border-white/[0.1]"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select privacy" />
                            </SelectTrigger>
                            <SelectContent
                              className={
                                theme === "dark"
                                  ? "bg-[#2a2a2a] border-gray-600 text-white"
                                  : ""
                              }
                            >
                              <SelectItem value="PUBLIC">Public</SelectItem>
                              <SelectItem value="PRIVATE">Private</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                {/* Nội dung tab AI Options */}
                <TabsContent value="ai" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ai-generated"
                        checked={isAIGenerated}
                        onCheckedChange={setIsAIGenerated}
                      />
                      <UILabel
                        htmlFor="ai-generated"
                        className={theme === "dark" ? "text-white" : ""}
                      >
                        AI Generated Playlist
                      </UILabel>
                    </div>
                    {isAIGenerated && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <UILabel
                            htmlFor="basedOnMood"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Based on Mood
                          </UILabel>
                          <Input
                            id="basedOnMood"
                            value={basedOnMood}
                            onChange={(e) => setBasedOnMood(e.target.value)}
                            placeholder="e.g., Energetic, Chill, Romantic"
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                        </div>
                        <div>
                          <UILabel
                            htmlFor="basedOnGenre"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Based on Genre
                          </UILabel>
                          <Input
                            id="basedOnGenre"
                            value={basedOnGenre}
                            onChange={(e) => setBasedOnGenre(e.target.value)}
                            placeholder="e.g., Pop, Rock, Jazz"
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                        </div>
                        <div>
                          <UILabel
                            htmlFor="basedOnArtist"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Based on Artist
                          </UILabel>
                          <Input
                            id="basedOnArtist"
                            value={basedOnArtist}
                            onChange={(e) => setBasedOnArtist(e.target.value)}
                            placeholder="e.g., Taylor Swift, The Weeknd"
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                        </div>
                        <div>
                          <UILabel
                            htmlFor="basedOnSongLength"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Based on Song Length (seconds)
                          </UILabel>
                          <Input
                            id="basedOnSongLength"
                            type="number"
                            value={basedOnSongLength}
                            onChange={(e) => setBasedOnSongLength(e.target.value)}
                            placeholder="e.g., 180 (for 3 minutes)"
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                        </div>
                        <div>
                          <UILabel
                            htmlFor="basedOnReleaseTime"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Based on Release Time
                          </UILabel>
                          <Input
                            id="basedOnReleaseTime"
                            value={basedOnReleaseTime}
                            onChange={(e) => setBasedOnReleaseTime(e.target.value)}
                            placeholder="e.g., last_month, last_year, 2020s"
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                        </div>
                        <div>
                          <UILabel
                            htmlFor="trackCount"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Number of Tracks
                          </UILabel>
                          <Input
                            id="trackCount"
                            type="number"
                            value={trackCount}
                            onChange={(e) =>
                              setTrackCount(parseInt(e.target.value, 10))
                            }
                            min={5}
                            max={50}
                            required={isAIGenerated}
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </form>
        </div>

        {/* Footer cố định */}
        <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-white/10">
          <Button
            variant="outline"
            onClick={onClose}
            className={
              theme === "dark"
                ? "border-white/20 text-white hover:bg-white/10"
                : ""
            }
          >
            Cancel
          </Button>
          <Button type="submit" form="system-playlist-form">
            {mode === "create" ? "Create Playlist" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Album Detail Modal
interface AlbumDetailModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

export function AlbumDetailModal({
  album,
  isOpen,
  onClose,
  theme = "light",
}: AlbumDetailModalProps) {
  const { dominantColor } = useDominantColor(album?.coverUrl);

  if (!album) return null;

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Sắp xếp bài hát theo trackNumber (nếu có) và sau đó theo title
  const sortedTracks = [...(album.tracks || [])].sort((a, b) => {
    const trackNumberA = a.trackNumber ?? Infinity;
    const trackNumberB = b.trackNumber ?? Infinity;

    if (trackNumberA !== trackNumberB) {
      return trackNumberA - trackNumberB;
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${theme === "dark" ? "bg-[#1e1e1e] border-[#404040]" : "bg-white"}
         p-0 rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden`}
      >
        <DialogTitle className="sr-only">{album.title}</DialogTitle>
        <div
          className="relative overflow-y-auto max-h-[90vh]"
          style={{
            background: dominantColor
              ? `linear-gradient(180deg, 
                  ${dominantColor} 0%, 
                  ${dominantColor}99 15%,
                  ${dominantColor}40 30%,
                  ${theme === "light" ? "#ffffff" : "#1e1e1e"} 100%)`
              : theme === "light"
                ? "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)"
                : "linear-gradient(180deg, #2c2c2c 0%, #1e1e1e 100%)",
          }}
        >
          {/* Close button */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
              className={`
                w-8 h-8 rounded-full flex items-center justify-center 
                ${theme === 'dark'
                  ? 'bg-black/20 hover:bg-black/40 text-white/90'
                  : 'bg-white/20 hover:bg-white/40 text-black/90'}
              `}
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-6 pb-2">
            {/* Album header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Album Cover */}
              {album.coverUrl && (
                <div className="w-[200px] flex-shrink-0">
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className={`w-full aspect-square object-cover rounded-xl shadow-2xl ${
                      theme === "light"
                        ? "shadow-gray-200/50"
                        : "shadow-black/50"
                      }`}
                  />
                </div>
              )}

              {/* Album Info */}
              <div className="flex flex-col gap-3 text-center md:text-left">
                <h2
                  className={`text-2xl md:text-3xl font-bold ${
                    theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                >
                  {album.title}
                </h2>

                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span
                    className={theme === "light" ? "text-gray-900" : "text-white/90"}
                  >
                    {album.artist?.artistName || "Unknown Artist"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                      }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(album.releaseDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                      }`}
                  >
                    <Music className="w-4 h-4" />
                    <span>{album.totalTracks || 0} tracks</span>
                  </div>
                </div>

                {album.genres?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap justify-center md:justify-start mt-2">
                    {album.genres.map(({ genre }) => (
                      <span
                        key={genre?.id || "unknown"}
                        className={`px-2.5 py-0.5 rounded-full text-xs ${
                          theme === "light"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-white/10 text-white/80"
                          }`}
                      >
                        {genre?.name || "Unknown Genre"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Track List */}
          {sortedTracks.length > 0 && (
            <div className="px-6 pb-6 pt-2">
              <div
                className={`w-full rounded-xl overflow-hidden border backdrop-blur-sm ${
                  theme === "light"
                    ? "bg-gray-50/90 border-gray-200"
                    : "bg-black/20 border-white/10"
                  }`}
              >
                {/* Header - Desktop only */}
                <div
                  className={`hidden md:block px-6 py-3 border-b ${
                    theme === "light" ? "border-gray-200" : "border-white/10"
                    }
                    }`}
                >
                  <div
                    className={`grid grid-cols-[48px_4fr_2fr_250px_100px] gap-4 text-xs ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                      }
                    }`}
                  >
                    <div className="text-center">#</div>
                    <div>Title</div>
                    <div>Artists</div>
                    <div className="text-center">Player</div>
                    <div className="text-right">Duration</div>
                  </div>
                </div>

                <div
                  className={`divide-y ${
                    theme === "light" ? "divide-gray-200" : "divide-white/10"
                    }`}
                >
                  {sortedTracks.map((track) => (
                    <div
                      key={track.id}
                      className={`md:grid md:grid-cols-[48px_4fr_2fr_250px_100px] md:gap-4 px-4 md:px-6 py-2.5 md:py-3 ${
                        theme === "light"
                          ? "hover:bg-gray-100"
                          : "hover:bg-white/5"
                        }`}
                    >
                      {/* Track number */}
                      <div
                        className={`hidden md:flex items-center justify-center ${
                          theme === "light" ? "text-gray-600" : "text-white/60"
                          }`}
                      >
                        {track.trackNumber}
                      </div>

                      {/* Mobile Layout - Including Player */}
                      <div className="md:hidden flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col flex-1 min-w-0">
                            <span
                              className={`font-medium text-sm line-clamp-1 ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                                }`}
                            >
                              {track.title}
                            </span>
                            <div
                              className={`text-xs line-clamp-1 ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-white/60"
                                }`}
                            >
                              {track.artist?.artistName || "Unknown Artist"}
                              {track.featuredArtists?.length > 0 && (
                                <span
                                  className={theme === "light"
                                    ? "text-gray-400"
                                    : "text-white/40"}
                                >
                                  {" "}
                                  • feat.{" "}
                                  {track.featuredArtists
                                    .map(
                                      ({ artistProfile }) =>
                                        artistProfile?.artistName ||
                                        "Unknown Artist"
                                    )
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-sm whitespace-nowrap pl-3 ${
                              theme === "light"
                                ? "text-gray-600"
                                : "text-white/60"
                              }`}
                          >
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                        {/* Mobile Audio Player */}
                        {track.audioUrl && (
                          <div className="w-full">
                            <audio
                              controls
                              src={track.audioUrl}
                              className="w-full h-8 rounded-md"
                              style={{
                                filter:
                                  theme === "dark"
                                    ? "invert(1) sepia(0.1) saturate(0.8) hue-rotate(180deg)"
                                    : "none",
                              }}
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </div>

                      {/* Desktop Layout */}
                      <div
                        className={`hidden md:flex items-center min-w-0 ${
                          theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                      >
                        <span className="font-medium line-clamp-1">
                          {track.title}
                        </span>
                      </div>

                      <div className="hidden md:flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`line-clamp-1 ${
                              theme === "light"
                                ? "text-gray-900"
                                : "text-white/90"
                              }`}
                          >
                            {track.artist?.artistName || "Unknown Artist"}
                          </span>
                        </div>
                        {track.featuredArtists?.length > 0 && (
                          <div
                            className={`text-xs line-clamp-1 mt-0.5 ${
                              theme === "light"
                                ? "text-gray-500"
                                : "text-white/50"
                              }`}
                          >
                            feat.{" "}
                            {track.featuredArtists
                              .map(
                                ({ artistProfile }) =>
                                  artistProfile?.artistName || "Unknown Artist"
                              )
                              .join(", ")}
                          </div>
                        )}
                      </div>

                      {/* Desktop Audio Player */}
                      <div className="hidden md:flex items-center">
                        {track.audioUrl && (
                          <audio
                            controls
                            src={track.audioUrl}
                            className="w-full h-8 rounded-md"
                            style={{
                              filter:
                                theme === "dark"
                                  ? "invert(1) sepia(0.1) saturate(0.8) hue-rotate(180deg)"
                                  : "none",
                            }}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        )}
                      </div>

                      <div
                        className={`hidden md:flex items-center justify-end ${
                          theme === "light" ? "text-gray-600" : "text-white/60"
                          }`}
                      >
                        {formatDuration(track.duration)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Copyright Label Footer */}
                {album.label && (
                  <div
                    className={`px-6 py-3 text-xs ${
                      theme === "light" ? "text-gray-500" : "text-white/40"
                      }`}
                  >
                    © {album.label.name || "Unknown Label"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Track Detail Modal
interface TrackDetailModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
  currentArtistId?: string;
}

export function TrackDetailModal({
  track,
  isOpen,
  onClose,
  theme = "light",
  currentArtistId,
}: TrackDetailModalProps) {
  const router = useRouter();
  const { dominantColor } = useDominantColor(track?.coverUrl);

  if (!track) return null;

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleArtistClick = (artistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(); 
    router.push(`/admin/artists/${artistId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${theme === "dark" ? "bg-[#1e1e1e] border-[#404040]" : "bg-white"}
         p-0 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden`}
      >
        <DialogTitle className="sr-only">{track.title}</DialogTitle>
        <div
          className="relative overflow-y-auto max-h-[90vh]"
          style={{
            background: dominantColor
              ? `linear-gradient(180deg, 
                  ${dominantColor} 0%, 
                  ${dominantColor}99 15%,
                  ${dominantColor}40 30%,
                  ${theme === "light" ? "#ffffff" : "#1e1e1e"} 100%)`
              : theme === "light"
                ? "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)"
                : "linear-gradient(180deg, #2c2c2c 0%, #1e1e1e 100%)",
          }}
        >
          {/* Close button */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
              className={`
                w-8 h-8 rounded-full flex items-center justify-center 
                ${theme === 'dark'
                  ? 'bg-black/20 hover:bg-black/40 text-white/90'
                  : 'bg-white/20 hover:bg-white/40 text-black/90'}
              `}
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-6">
            {/* Track header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Track Cover */}
              <div className="w-[200px] flex-shrink-0">
                <img
                  src={track.coverUrl ||
                    track.album?.coverUrl ||
                    "https://placehold.co/200x200?text=No+Cover"}
                  alt={track.title}
                  className={`w-full aspect-square object-cover rounded-xl shadow-2xl ${
                    theme === "light" ? "shadow-gray-200/50" : "shadow-black/50"
                    }`}
                />
              </div>

              {/* Track Info */}
              <div className="flex flex-col gap-3 text-center md:text-left">
                <h2
                  className={`text-2xl md:text-3xl font-bold ${
                    theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                >
                  {track.title}
                </h2>

                {/* Main Artist - Only make clickable if not the current artist */}
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span
                    className={`font-medium ${
                      track.artist?.id !== currentArtistId ? "cursor-pointer hover:underline" : ""
                    } ${theme === "light" ? "text-gray-900" : "text-white"}`}
                    onClick={(e: React.MouseEvent) => 
                      track.artist?.id && 
                      track.artist.id !== currentArtistId && 
                      handleArtistClick(track.artist.id, e)
                    }
                  >
                    {track.artist?.artistName || "Unknown Artist"}
                  </span>
                </div>

                {/* Featured Artists Section with improved styling */}
                {track.featuredArtists?.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                    <div
                      className={`inline-flex items-center ${
                        theme === "light"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-800/40 text-gray-300"
                        } px-2.5 py-1 rounded-full text-sm`}
                    >
                      <span
                        className={theme === "light" ? "text-gray-500" : "text-gray-400"}
                      >
                        feat.
                      </span>
                      <div className="flex flex-wrap items-center ml-1">
                        {track.featuredArtists.map(
                          ({ artistProfile }, index) => (
                            <div
                              key={artistProfile?.id || index}
                              className="flex items-center"
                            >
                              {index > 0 && (
                                <span className="mx-1 opacity-60">•</span>
                              )}
                              <button
                                className="hover:underline font-medium inline-flex items-center"
                                onClick={(e) =>
                                  artistProfile?.id &&
                                  handleArtistClick(artistProfile.id, e)
                                }
                              >
                                {artistProfile?.artistName || "Unknown Artist"}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                      }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(track.releaseDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                      }`}
                  >
                    <Music className="w-4 h-4" />
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                </div>

                {track.album && (
                  <div className="mt-4">
                    <span
                      className={`text-sm font-medium ${
                        theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}
                    >
                      From the album:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <img
                        src={track.album.coverUrl || "https://placehold.co/150x150?text=No+Cover"}
                        alt={track.album.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <div
                          className={`text-sm font-medium ${theme === "light" ? "text-gray-900" : "text-white"}`}
                        >
                          {track.album.title}
                        </div>
                        <div
                          className={`text-xs ${theme === "light"
                              ? "text-gray-600"
                              : "text-gray-400"}`}
                        >
                          {track.album.type}
                          {"releaseDate" in track.album &&
                            ` • ${new Date(
                              track.album.releaseDate as string
                            ).getFullYear()}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {track.genres?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap justify-center md:justify-start mt-2">
                    {track.genres.map(({ genre }) => (
                      <span
                        key={genre?.id || "unknown"}
                        className={`px-2.5 py-0.5 rounded-full text-xs ${
                          theme === "light"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-white/10 text-white/80"
                          }`}
                      >
                        {genre?.name || "Unknown Genre"}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <div
                    className={`flex items-center gap-2 ${theme === "light" ? "text-gray-600" : "text-white/60"}`}
                  >
                    <span>Track #:</span>
                    <span
                      className={theme === "light" ? "text-gray-900" : "text-white"}
                    >
                      {track.trackNumber}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 mt-1 ${theme === "light" ? "text-gray-600" : "text-white/60"}`}
                  >
                    <span>Play count:</span>
                    <span
                      className={theme === "light" ? "text-gray-900" : "text-white"}
                    >
                      {track.playCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Track Label */}
          <div
            className={`px-6 pb-4 pt-2 text-xs ${theme === "dark" ? "text-white/40" : "text-gray-500"}`}
          >
            {track.label && (
              <span>© {track.label.name || "Unknown Label"}</span>
            )}
          </div>

          {/* Track Audio Player */}
          {track.audioUrl && (
            <div className="mt-4 w-full px-6 pb-6">
              <audio
                controls
                src={track.audioUrl}
                className={`w-full rounded-lg ${theme === "dark"
                    ? "bg-[#282828] shadow-md shadow-black/30"
                    : "bg-gray-100 shadow-sm"}`}
                style={{
                  filter:
                    theme === "dark"
                      ? "invert(1) sepia(0.1) saturate(0.8) hue-rotate(180deg)"
                      : "none",
                }}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Track Modal
interface EditTrackModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trackId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditTrackModal({
  track,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: EditTrackModalProps) {
  const [formData, setFormData] = useState<Partial<Track>>({});
  const [isActive, setIsActive] = useState<boolean>(track?.isActive || false); // Add state for isActive
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (track) {
      setFormData({
        title: track.title || '',
        duration: track.duration || 0,
        releaseDate: track.releaseDate ? new Date(track.releaseDate).toISOString().split('T')[0] : '',
        trackNumber: track.trackNumber || 1,
      });
      setIsActive(track.isActive); // Set initial isActive state
    } else {
      setFormData({});
      setIsActive(false);
    }
  }, [track, isOpen]);

  if (!isOpen || !track) {
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!track) return;

    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Ensure releaseDate is sent in correct format if changed
        if (key === 'releaseDate' && value) {
            try {
              form.append(key, new Date(value.toString()).toISOString());
            } catch (err) {
              console.error("Invalid date format for releaseDate");
              toast.error("Invalid release date format.");
              return; // Prevent submission with invalid date
            }
        } else {
           form.append(key, value.toString());
        }
      }
    });
    // Append the isActive state
    form.append('isActive', String(isActive));

    try {
      setIsUploading(true);
      await onSubmit(track.id, form);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update track');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <Music className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Edit Track
                </DialogTitle>
                <DialogDescription className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Update track information and status
                </DialogDescription>
              </div>
            </div>
            {/* ... Close Button ... */}
             <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} id="edit-track-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* ... Title, Track Number, Duration, Release Date fields ... */}
            <div className="col-span-2 space-y-2">
              <UILabel htmlFor="title" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Title
              </UILabel>
              <Input
                id="title"
                name="title"
                value={formData.title || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter track title"
                required
              />
            </div>
            <div className="space-y-2">
              <UILabel htmlFor="trackNumber" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Track Number
              </UILabel>
              <Input
                id="trackNumber"
                name="trackNumber"
                type="number"
                min="1"
                value={formData.trackNumber || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter track number"
              />
            </div>
             <div className="space-y-2">
              <UILabel htmlFor="duration" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Duration (seconds)
              </UILabel>
              <Input
                id="duration"
                name="duration"
                type="number"
                min="0"
                step="1"
                value={formData.duration || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter duration in seconds"
              />
            </div>
             <div className="col-span-2 space-y-2">
              <UILabel htmlFor="releaseDate" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Release Date
              </UILabel>
              <Input
                id="releaseDate"
                name="releaseDate"
                type="date"
                value={formData.releaseDate || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full flex items-center",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
              />
            </div>

            {/* Is Active Switch */}
            <div className="col-span-2 flex items-center justify-between rounded-lg border p-4 mt-2">
              <div className="space-y-0.5">
                <UILabel className="text-base">
                  Track Status
                </UILabel>
                <p className="text-sm text-muted-foreground">
                  {isActive ? "Track is visible and playable." : "Track is hidden from users."}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                aria-label="Toggle track visibility"
              />
            </div>
          </div>
        </form>
        {/* ... Footer ... */}
         <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-track-form"
            disabled={isUploading}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
          >
            {isUploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Album Modal
interface EditAlbumModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (albumId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditAlbumModal({
  album,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: EditAlbumModalProps) {
  const [formData, setFormData] = useState<Partial<Album>>({});
  const [isActive, setIsActive] = useState<boolean>(album?.isActive || false); // Add state for isActive
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (album) {
      setFormData({
        title: album.title || '',
        releaseDate: album.releaseDate ? new Date(album.releaseDate).toISOString().split('T')[0] : '',
        type: album.type || 'ALBUM',
      });
      setIsActive(album.isActive); // Set initial isActive state
    } else {
      setFormData({});
      setIsActive(false);
    }
  }, [album, isOpen]);

  if (!isOpen || !album) {
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album) return;

    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Ensure releaseDate is sent in correct format if changed
         if (key === 'releaseDate' && value) {
            try {
              form.append(key, new Date(value.toString()).toISOString());
            } catch (err) {
              console.error("Invalid date format for releaseDate");
              toast.error("Invalid release date format.");
              return; // Prevent submission with invalid date
            }
         } else {
           form.append(key, value.toString());
         }
      }
    });
    // Append the isActive state
    form.append('isActive', String(isActive));

    try {
      setIsUploading(true);
      await onSubmit(album.id, form);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update album');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <AlbumIcon className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Edit Album
                </DialogTitle>
                <DialogDescription className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Update album information and status
                </DialogDescription>
              </div>
            </div>
            {/* ... Close Button ... */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} id="edit-album-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* ... Title, Album Type, Release Date fields ... */}
             <div className="col-span-2 space-y-2">
              <UILabel htmlFor="title" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Title
              </UILabel>
              <Input
                id="title"
                name="title"
                value={formData.title || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder="Enter album title"
                required
              />
            </div>
             <div className="col-span-2 space-y-2">
              <UILabel htmlFor="type" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Album Type
              </UILabel>
              <select
                id="type"
                name="type"
                value={formData.type || 'ALBUM'}
                onChange={handleInputChange}
                className={cn(
                  "w-full h-9 rounded-md px-3 py-2 text-sm border",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                )}
              >
                <option value="ALBUM">Album</option>
                <option value="EP">EP</option>
                <option value="SINGLE">Single</option>
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <UILabel htmlFor="releaseDate" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Release Date
              </UILabel>
              <Input
                id="releaseDate"
                name="releaseDate"
                type="date"
                value={formData.releaseDate || ''}
                onChange={handleInputChange}
                className={cn(
                  "w-full",
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
              />
            </div>

             {/* Is Active Switch */}
            <div className="col-span-2 flex items-center justify-between rounded-lg border p-4 mt-2">
              <div className="space-y-0.5">
                <UILabel className="text-base">
                  Album Status
                </UILabel>
                <p className="text-sm text-muted-foreground">
                  {isActive ? "Album is visible to users." : "Album is hidden from users."}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                aria-label="Toggle album visibility"
              />
            </div>
          </div>
        </form>
        {/* ... Footer ... */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-album-form"
            disabled={isUploading}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
          >
            {isUploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}