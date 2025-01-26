'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'react-toastify';
import pusher from '@/utils/pusher';

export default function RequestArtistPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    artistName: '',
    bio: '',
    facebookLink: 'https://www.facebook.com/',
    instagramLink: 'https://www.instagram.com/',
    genres: [] as string[],
    avatarFile: null as File | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genreOptions, setGenreOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);

  // Sử dụng useEffect để đảm bảo localStorage chỉ được truy cập trên client-side
  useEffect(() => {
    const storedValue = localStorage.getItem('hasPendingRequest');
    setHasPendingRequest(storedValue ? JSON.parse(storedValue) : false);
  }, []);

  useEffect(() => {
    const userDataStr = localStorage.getItem('userData');
    if (!userDataStr) return;

    const userData = JSON.parse(userDataStr);
    const userId = userData.id;

    // Subscribe to Pusher channel
    const channel = pusher.subscribe(`user-${userId}`);
    console.log('Subscribed to Pusher channel:', `user-${userId}`);

    // Listen for artist request status updates
    channel.bind(
      'artist-request-status',
      (data: { type: string; message: string; hasPendingRequest: boolean }) => {
        console.log('Received Pusher event:', data);
        if (
          data.type === 'REQUEST_REJECTED' ||
          data.type === 'REQUEST_APPROVED'
        ) {
          setHasPendingRequest(false);
          localStorage.setItem('hasPendingRequest', JSON.stringify(false));

          // Tăng số thông báo
          const currentCount = Number(
            localStorage.getItem('notificationCount') || '0'
          );
          localStorage.setItem('notificationCount', String(currentCount + 1));

          toast.info(data.message);
        }
      }
    );

    return () => {
      channel.unbind('artist-request-status');
      pusher.unsubscribe(`user-${userId}`);
    };
  }, []);

  // Kiểm tra xem người dùng đã có yêu cầu trở thành Artist chưa
  useEffect(() => {
    const checkPendingRequest = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await api.user.checkArtistRequest(token);
        console.log('Check pending request response:', response);

        setHasPendingRequest(response.hasPendingRequest);
        localStorage.setItem(
          'hasPendingRequest',
          JSON.stringify(response.hasPendingRequest)
        );

        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
          const user = JSON.parse(userDataStr);
          if (user.role === 'ARTIST') {
            router.push('/profile');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking pending request:', err);
      }
    };

    checkPendingRequest();
  }, [router]);

  // Lấy danh sách thể loại
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.user.getAllGenres();
        setGenreOptions(response);
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError('Failed to load genres');
      }
    };

    fetchGenres();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (formData.avatarFile && formData.avatarFile.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds the limit of 5MB');
      }

      const submitFormData = new FormData();
      submitFormData.append('artistName', formData.artistName);
      submitFormData.append('bio', formData.bio);
      submitFormData.append('genres', formData.genres.join(','));

      const socialMediaLinks = {
        facebook: formData.facebookLink.replace(
          'https://www.facebook.com/',
          ''
        ),
        instagram: formData.instagramLink.replace(
          'https://www.instagram.com/',
          ''
        ),
      };
      submitFormData.append(
        'socialMediaLinks',
        JSON.stringify(socialMediaLinks)
      );

      if (formData.avatarFile) {
        submitFormData.append('avatar', formData.avatarFile);
      }

      await api.user.requestArtistRole(token, submitFormData);

      // Cập nhật trạng thái ngay lập tức
      setHasPendingRequest(true);
      localStorage.setItem('hasPendingRequest', JSON.stringify(true));

      // Hiển thị thông báo thành công
      toast.success('Your request has been submitted successfully!', {
        autoClose: 2000, // Thời gian hiển thị thông báo (2 giây)
      });

      // Trì hoãn chuyển trang sau khi thông báo được hiển thị
      setTimeout(() => {
        router.push('/profile'); // Chuyển hướng đến trang profile sau khi submit thành công
      }, 2000); // Đợi 2 giây trước khi chuyển trang
    } catch (error: any) {
      console.error('Error requesting artist role:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to request artist role'
      );
      toast.error(error.message || 'Failed to request artist role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nếu đã có yêu cầu trở thành Artist, hiển thị thông báo
  if (hasPendingRequest) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Request to Become an Artist
          </h1>
        </div>

        <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
          <p className="text-center text-white">
            You have already submitted a request to become an artist. Please
            wait for admin approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Request to Become an Artist
        </h1>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="artistName"
                className="block text-sm font-medium mb-1"
              >
                Artist Name
              </label>
              <input
                id="artistName"
                type="text"
                value={formData.artistName}
                onChange={(e) =>
                  setFormData({ ...formData, artistName: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                rows={4}
                required
              />
            </div>

            <div>
              <label
                htmlFor="facebookLink"
                className="block text-sm font-medium mb-1"
              >
                Facebook Link
              </label>
              <input
                id="facebookLink"
                type="url"
                value={formData.facebookLink}
                onChange={(e) =>
                  setFormData({ ...formData, facebookLink: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="instagramLink"
                className="block text-sm font-medium mb-1"
              >
                Instagram Link
              </label>
              <input
                id="instagramLink"
                type="url"
                value={formData.instagramLink}
                onChange={(e) =>
                  setFormData({ ...formData, instagramLink: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Genres</label>
              <SearchableSelect
                options={genreOptions}
                value={formData.genres}
                onChange={(selected) =>
                  setFormData({
                    ...formData,
                    genres: Array.isArray(selected) ? selected : [selected],
                  })
                }
                placeholder="Select genres"
                multiple={true}
                required={true}
              />
            </div>

            <div>
              <label
                htmlFor="avatar"
                className="block text-sm font-medium mb-1"
              >
                Avatar Image
              </label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    avatarFile: e.target.files?.[0] || null,
                  })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent file:bg-white/20 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:text-sm file:font-medium hover:file:bg-white/30"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-white text-[#121212] rounded-md hover:bg-white/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
