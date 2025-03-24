import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-toastify';
import axios from 'axios';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateEventDialog({ open, onOpenChange, onSuccess }: CreateEventDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    time: '',
    date: '',
    songOrAlbum: '',
    artistName: '',
    fileUrl: '', 
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, fileUrl: URL.createObjectURL(file) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }
      if (!formData.time || !formData.date || !formData.songOrAlbum || !formData.artistName) {
        toast.error('Vui lòng nhập đầy đủ thông tin');
        return;
      }
      const response = await axios.post('/api/event/create', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        toast.success('Tạo event thành công');
        setFormData({ time: '', date: '', songOrAlbum: '', artistName: '', fileUrl: '' });
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể tạo event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo event mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Thời gian</label>
            <Input
              name="time"
              placeholder="Ví dụ: 18:00"
              value={formData.time}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Ngày/Tháng/Năm</label>
            <Input
              name="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Tên bài hát/Tên album</label>
            <Input
              name="songOrAlbum"
              placeholder="Nhập tên bài hát hoặc album"
              value={formData.songOrAlbum}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Tên nghệ sĩ</label>
            <Input
              name="artistName"
              placeholder="Nhập tên nghệ sĩ"
              value={formData.artistName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Upload file nhạc</label>
            <Input
              name="file"
              type="file"
              onChange={handleFileChange}
              accept="audio/*"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang tạo...' : 'Tạo event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
