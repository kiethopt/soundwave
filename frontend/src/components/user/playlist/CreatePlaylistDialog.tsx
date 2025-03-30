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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tạo playlist mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              name="name"
              placeholder="Tên playlist"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Textarea
              name="description"
              placeholder="Mô tả (tùy chọn)"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Select
              value={formData.privacy}
              onValueChange={handlePrivacyChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn quyền riêng tư" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                <SelectItem value="PUBLIC">Công khai</SelectItem>
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
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? 'Đang tạo...' : 'Tạo playlist'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
