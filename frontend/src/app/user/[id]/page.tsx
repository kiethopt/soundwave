'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  // Các field khác nếu cần
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  // Lấy id từ params
  const idFromParams = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Kiểm tra rỏ ràng id, nếu không tồn tại hoặc không phải string thì return.
  if (!idFromParams || typeof idFromParams !== 'string') {
    // Bạn có thể hiển thị thông báo lỗi hoặc chuyển hướng nếu cần.
    console.error('Invalid id parameter');
    return <div>Invalid user id</div>;
  }
  
  // Bây giờ idFromParams chắc chắn là string.
  const validId = idFromParams;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [follow, setFollow] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Lấy token và userData từ localStorage
  const token = localStorage.getItem('userToken') || '';
  const storedUserData = localStorage.getItem('userData');
  const userData = storedUserData ? JSON.parse(storedUserData) : {};

  // 1. Lấy thông tin profile của user được xem
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Giả sử endpoint công khai: GET /api/user/profile/:id
        const data = await api.user.getUserById(validId, token);
        setUserProfile(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [validId, token]);

  // 2. Kiểm tra xem user hiện tại đã follow user được xem chưa và xem có phải chủ sở hữu hay không
  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const response = await api.user.getFollowing(token);
        if (response) {
          // Giả sử response là mảng các user mà user hiện tại đang theo dõi
          const isFollowing = response.some((profile: UserProfile) => profile.id === validId);
          const isOwner = userData && userData.id === validId;
          setFollow(isFollowing);
          setIsOwner(isOwner);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (token) {
      fetchFollowing();
    }
  }, [validId, token, userData]);

  // 3. Xử lý follow/unfollow
  const handleFollow = async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      if (follow) {
        await api.user.unfollowUserOrArtist(validId, token);
        toast.success('Unfollowed user!');
        setFollow(false);
      } else {
        await api.user.followUserOrArtist(validId, token);
        toast.success('Followed user!');
        setFollow(true);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to follow user!');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userProfile) {
    return <div>User not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center space-x-4">
        <img
          src={userProfile.avatar || '/images/default-avatar.jpg'}
          alt={userProfile.name}
          className="w-32 h-32 rounded-full object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold">{userProfile.name}</h1>
          <p className="text-lg text-gray-500">@{userProfile.username}</p>
          {/* Hiển thị nút Follow/Unfollow nếu không phải chủ sở hữu */}
          {!isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFollow}
              className="flex-shrink-0 justify-center min-w-[80px] text-black hover:text-red-500"
              >
              {follow ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-8">
        <p>Additional user details go here...</p>
      </div>
    </div>
  );
}
