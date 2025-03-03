'use client';

import { useState } from 'react';
import { api } from '@/utils/api';
import { User } from '@/types';
import { toast } from 'react-toastify';
import AdminRoute from '@/components/admin/AdminRoute';

export default function AdminProfile() {
  const [userData, setUserData] = useState<User | null>(() => {
    const storedUserData = localStorage.getItem('userData');
    return storedUserData ? JSON.parse(storedUserData) : null;
  });
  const [isEditing, setIsEditing] = useState(false);

  // Xử lý cập nhật thông tin
  const handleSave = async () => {
    if (!userData) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('name', userData.name || '');
      formData.append('email', userData.email);

      await api.admin.updateUser(userData.id, formData, token);

      // Cập nhật localStorage
      const updatedUserData = {
        ...JSON.parse(localStorage.getItem('userData') || '{}'),
        name: userData.name,
        email: userData.email,
      };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));

      toast.success('Cập nhật profile thành công');
      setIsEditing(false);
    } catch (error) {
      toast.error('Không thể cập nhật profile');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {!userData ? (
        <div className="p-6">Không tìm thấy thông tin người dùng</div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-6">Admin Profile</h1>
          <div className="space-y-6 bg-white dark:bg-[#282828] p-6 rounded-lg shadow">
            <div>
              <label className="block text-sm font-medium mb-1">Tên</label>
              {isEditing ? (
                <input
                  type="text"
                  value={userData.name || ''}
                  onChange={(e) =>
                    setUserData({ ...userData, name: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-[#333] dark:border-white/10 dark:text-white"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {userData.name || 'Chưa đặt tên'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={userData.email}
                  onChange={(e) =>
                    setUserData({ ...userData, email: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-[#333] dark:border-white/10 dark:text-white"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {userData.email}
                </p>
              )}
            </div>
            <div className="flex gap-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-white"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
