import React, { useState, useEffect,  useRef } from 'react';
import { User } from '@/types';
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
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { XIcon, Edit, Trash2, ShieldAlert, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || ''
      });
      setAvatarPreview(user.avatar || null);
      setAvatarFile(null);
    } else {
      setFormData({});
      setAvatarPreview(null);
      setAvatarFile(null);
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

    const dataToSend = new FormData();
    if (formData.name !== undefined && formData.name !== user.name) dataToSend.append('name', formData.name);
    if (formData.username !== undefined && formData.username !== user.username) dataToSend.append('username', formData.username);
    if (formData.email !== undefined && formData.email !== user.email) dataToSend.append('email', formData.email);
    if (avatarFile) {
      dataToSend.append('avatar', avatarFile);
    } else if (avatarPreview === null && user.avatar) {
      dataToSend.append('avatar', '');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[425px] ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Edit User: {user?.name || user?.email}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="edit-user-form" className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Image
                src={avatarPreview || '/images/default-avatar.jpg'}
                alt="Avatar Preview"
                width={96}
                height={96}
                className="rounded-full object-cover w-24 h-24 border cursor-pointer transition-transform hover:scale-105"
                onClick={handleCoverClick}
              />
              <button
                type="button"
                onClick={handleCoverClick}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white"
              >
                <Edit size={24} />
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className={`absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors ${theme === 'dark' ? 'border border-gray-700' : 'border border-white'}`}
                  aria-label="Remove avatar"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <UILabel htmlFor="name" className={`text-right ${theme === 'dark' ? 'text-gray-300' : ''}`}>
                Name
              </UILabel>
              <Input
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className={`col-span-3 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                placeholder="Enter full name"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <UILabel htmlFor="username" className={`text-right ${theme === 'dark' ? 'text-gray-300' : ''}`}>
                Username
              </UILabel>
              <Input
                id="username"
                name="username"
                value={formData.username || ''}
                onChange={handleInputChange}
                className={`col-span-3 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                placeholder="Enter username"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <UILabel htmlFor="email" className={`text-right ${theme === 'dark' ? 'text-gray-300' : ''}`}>
                Email
              </UILabel>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={`col-span-3 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}`}
                placeholder="Enter email address"
              />
            </div>
          </div>
        </form>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : ''}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-user-form"
            className={theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Save Changes
          </Button>
        </DialogFooter>
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