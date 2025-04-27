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
import { XIcon, Trash2, ShieldAlert, UserCog, Eye, EyeOff, XCircle, CheckCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { UserIcon } from 'lucide-react';
import { Edit, Tags } from './Icons';
import Image from 'next/image';

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

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || ''
      });
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } else {
      setFormData({});
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
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
    if (formData.name !== undefined && formData.name !== user.name) dataToSend.append('name', formData.name);
    if (formData.username !== undefined && formData.username !== user.username) dataToSend.append('username', formData.username);
    if (formData.email !== undefined && formData.email !== user.email) dataToSend.append('email', formData.email);
    if (newPassword) {
      dataToSend.append('newPassword', newPassword);
    }

    let hasChanges = false;
    dataToSend.forEach((value, key) => { hasChanges = true; });

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
                  Update user information
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
              />
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="newPassword" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                New Password
              </UILabel>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(
                    "w-full pr-10",
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  )}
                  placeholder="Leave blank to keep current"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute inset-y-0 right-0 h-full w-10",
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200 focus:bg-transparent hover:bg-transparent'
                      : 'text-gray-500 hover:text-gray-700 focus:bg-transparent hover:bg-transparent'
                  )}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="confirmNewPassword" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                Confirm New Password
              </UILabel>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute inset-y-0 right-0 h-full w-10",
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200 focus:bg-transparent hover:bg-transparent'
                      : 'text-gray-500 hover:text-gray-700 focus:bg-transparent hover:bg-transparent'
                  )}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
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
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-user-form"
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
          >
            Save Changes
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
      // Reset form fields to reflect the current label's data
      if (formRef.current) {
         const nameInput = formRef.current.elements.namedItem('name') as HTMLInputElement;
         const descriptionInput = formRef.current.elements.namedItem('description') as HTMLTextAreaElement;
         if (nameInput) nameInput.value = label.name;
         if (descriptionInput) descriptionInput.value = label.description || '';
      }
      setIsSubmitting(false);
    } else if (!isOpen) {
        // Clear preview when modal closes if not saving
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

    // Only add the file if a new one was selected
    if (logoFile) {
      formData.set("logoFile", logoFile);
    } else {
      // If no new file is selected, ensure logoFile field is not sent
      formData.delete("logoFile");
    }

    setIsSubmitting(true);
    try {
      await onSubmit(label.id, formData);
      onClose(); // Close modal on success
    } catch (error) {
      // Error handled by the parent component
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
               name="logoFile" // Important for FormData association, although we handle file state separately
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