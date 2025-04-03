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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/utils/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePlaylistDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
  });
  const router = useRouter();
  const { theme } = useTheme();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    console.log(`Input changed - ${name}:`, value);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePrivacyChange = (value: 'PUBLIC' | 'PRIVATE') => {
    console.log('Privacy changed:', value);
    setFormData((prev) => ({
      ...prev,
      privacy: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const token = localStorage.getItem('userToken');
      const userData = localStorage.getItem('userData');

      console.log('Submit playlist form:', {
        formData,
        hasToken: !!token,
        hasUserData: !!userData,
      });

      if (!token || !userData) {
        toast.error('Vui lòng đăng nhập lại');
        router.push('/login');
        return;
      }

      // Validate form data
      if (!formData.name?.trim()) {
        toast.error('Vui lòng nhập tên playlist');
        return;
      }

      const response = await api.playlists.create(
        {
          name: formData.name.trim(),
          description: formData.description?.trim(),
          privacy: formData.privacy || 'PRIVATE',
        },
        token
      );

      console.log('Create playlist response:', response);

      if (response.success) {
        setFormData({
          name: '',
          description: '',
          privacy: 'PRIVATE',
        });
        onOpenChange(false);
        toast.success('Đã tạo playlist thành công');
        await onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      toast.error(error.message || 'Không thể tạo playlist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[425px] ${
          theme === 'light'
            ? 'bg-white text-gray-900 border border-gray-200'
            : 'bg-[#121212] text-white border border-white/10'
        }`}
      >
        <DialogHeader>
          <DialogTitle
            className={theme === 'light' ? 'text-gray-900' : 'text-white'}
          >
            Tạo playlist mới
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              name="name"
              placeholder="Tên playlist"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={
                theme === 'light'
                  ? 'border-gray-200 focus:border-gray-300'
                  : 'border-white/10 focus:border-white/20'
              }
            />
          </div>
          <div className="space-y-2">
            <Textarea
              name="description"
              placeholder="Mô tả (tùy chọn)"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={
                theme === 'light'
                  ? 'border-gray-200 focus:border-gray-300'
                  : 'border-white/10 focus:border-white/20'
              }
            />
          </div>
          <div className="space-y-2">
            <Select
              value={formData.privacy}
              onValueChange={handlePrivacyChange}
            >
              <SelectTrigger
                className={
                  theme === 'light'
                    ? 'border-gray-200 bg-white text-gray-900 focus:border-gray-300'
                    : 'border-white/10 bg-[#121212] text-white focus:border-white/20'
                }
              >
                <SelectValue placeholder="Chọn quyền riêng tư" />
              </SelectTrigger>
              <SelectContent
                className={
                  theme === 'light'
                    ? 'bg-white text-gray-900 border-gray-200'
                    : 'bg-[#121212] text-white border-white/10'
                }
              >
                <SelectItem
                  value="PRIVATE"
                  className={theme === 'light' ? 'text-gray-900' : 'text-white'}
                >
                  Riêng tư
                </SelectItem>
                <SelectItem
                  value="PUBLIC"
                  className={theme === 'light' ? 'text-gray-900' : 'text-white'}
                >
                  Công khai
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  privacy: 'PRIVATE',
                });
                onOpenChange(false);
              }}
              disabled={isLoading}
              className={
                theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-neutral-800'
              }
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className={
                theme === 'light'
                  ? 'bg-black text-white hover:bg-black/80'
                  : 'bg-white text-black hover:bg-white/80'
              }
            >
              {isLoading ? 'Đang tạo...' : 'Tạo playlist'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
