'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft, User, Image as ImageIcon, Music, Link2, Save, X, Info, Clock } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import { getSocket } from '@/utils/socket';
import type { User as UserType } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SectionHeading = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <Icon className="w-5 h-5 text-white/60" />
    <h2 className="text-lg font-semibold text-white/90">{title}</h2>
  </div>
);

export default function RequestArtistPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    artistName: '',
    bio: '',
    label: '',
    facebookLink: 'https://www.facebook.com/',
    instagramLink: 'https://www.instagram.com/',
    genres: [] as string[],
    avatarFile: null as File | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [genreOptions, setGenreOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [genreError, setGenreError] = useState<string | null>(null); // New state for genre error
  const [submissionTimestamp, setSubmissionTimestamp] = useState<number | null>(null); // Add state for timestamp

  useEffect(() => {
    const storedPending = localStorage.getItem('hasPendingRequest');
    const storedTimestamp = localStorage.getItem('submissionTimestamp'); // Read timestamp
    setHasPendingRequest(storedPending ? JSON.parse(storedPending) : false);
    setSubmissionTimestamp(storedTimestamp ? JSON.parse(storedTimestamp) : null); // Set timestamp state
  }, []);

  // Lắng nghe sự kiện Socket.IO
  useEffect(() => {
    const socket = getSocket();

    // Listen for artist request status updates
    const handleArtistRequestStatus = (
      data: { type: string; message: string; hasPendingRequest?: boolean; userId?: string }
    ) => {
      console.log('Received artist-request-status event via Socket.IO:', data);

      if (
        data.type === 'REQUEST_REJECTED' ||
        data.type === 'REQUEST_APPROVED'
      ) {
        const newPendingStatus = typeof data.hasPendingRequest === 'boolean' ? data.hasPendingRequest : false;
        setHasPendingRequest(newPendingStatus);
        localStorage.setItem('hasPendingRequest', JSON.stringify(newPendingStatus));

        toast(data.message);
      }
    };

    socket.on('artist-request-status', handleArtistRequestStatus);

    // Cleanup listener
    return () => {
      console.log('Cleaning up Request Artist page socket listener');
      socket.off('artist-request-status', handleArtistRequestStatus);
    };
  }, []);

  // Kiểm tra xem người dùng đã có yêu cầu trở thành Artist chưa
  useEffect(() => {
    const checkPendingRequest = async () => {
      let user: UserType | null = null;
      try {
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
          try {
            user = JSON.parse(userDataStr);
          } catch (parseError) {
            console.error('Lỗi parse userData trong checkPendingRequest:', parseError);
            localStorage.removeItem('userData');
          }
        }

        // Sửa lỗi linter: Kiểm tra sự tồn tại và trạng thái active của artistProfile
        if (user && user.artistProfile && user.artistProfile.isActive) {
            console.log('User đã là Artist active, chuyển hướng...');
            router.push(`/artist/profile/${user.artistProfile.id}`); // Chuyển hướng đến trang artist profile
            return;
        }

        // Chỉ kiểm tra request nếu chưa phải là artist active
        const token = localStorage.getItem('userToken');
        if (!token) {
          // Không cần throw lỗi ở đây, chỉ đơn giản là không kiểm tra được
          console.warn('Không tìm thấy token để kiểm tra artist request.');
          return;
        }

        const response = await api.user.checkArtistRequest(token);
        console.log('Check pending request response:', response);

        setHasPendingRequest(response.hasPendingRequest);
        localStorage.setItem(
          'hasPendingRequest',
          JSON.stringify(response.hasPendingRequest)
        );

      } catch (err) {
        console.error('Error checking pending request:', err);
        // Có thể thêm xử lý lỗi cụ thể hơn nếu cần
      }
    };

    checkPendingRequest();
  }, [router]);

  // Lấy danh sách thể loại
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const token = localStorage.getItem('userToken') || '';
        const response = await api.user.getAllGenres(token);
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

    // Reset general error and specific errors
    setError(null);
    setGenreError(null); // Reset specific genre error

    // --- Genre Validation --- 
    if (formData.genres.length === 0) {
        setGenreError('This field is required'); // Set specific genre error message
        toast.error('Please select at least one genre.');
        return; // Stop submission
    } 
    // --- End Genre Validation ---

    setIsSubmitting(true); // Set submitting state only if validation passes

    let userData: UserType | null = null;
    try {
      const token = localStorage.getItem('userToken');
      const userDataStr = localStorage.getItem('userData');

      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      if (userDataStr) {
          try {
              userData = JSON.parse(userDataStr);
          } catch (parseError) {
              console.error('Lỗi parse userData trong handleSubmit:', parseError);
              throw new Error('User data is corrupted. Please log in again.');
          }
      } else {
          throw new Error('User data not found. Please log in again.');
      }

      if (!userData) { // Kiểm tra lại userData sau khi parse
          throw new Error('Failed to load user data.');
      }

      if (formData.avatarFile && formData.avatarFile.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds the limit of 5MB');
      }

      const submitFormData = new FormData();
      submitFormData.append('artistName', formData.artistName);
      submitFormData.append('bio', formData.bio);
      submitFormData.append('label', formData.label);
      submitFormData.append('genres', formData.genres.join(','));

      // Send the full URLs
      const socialMediaLinks = {
        facebook: formData.facebookLink, 
        instagram: formData.instagramLink,
      };
      submitFormData.append(
        'socialMediaLinks',
        JSON.stringify(socialMediaLinks)
      );

      if (formData.avatarFile) {
        submitFormData.append('avatar', formData.avatarFile);
      }

      await api.user.requestArtistRole(token, submitFormData);

      const timestamp = Date.now(); // Get current timestamp
      setHasPendingRequest(true);
      setSubmissionTimestamp(timestamp); // Set timestamp state
      localStorage.setItem('hasPendingRequest', JSON.stringify(true));
      localStorage.setItem('submissionTimestamp', JSON.stringify(timestamp)); // Store timestamp
      toast.success('Your request has been submitted successfully!', { duration: 2000 });

      // Sửa lỗi linter: Lưu userId vào biến trước khi dùng trong setTimeout
      if (userData?.id) {
        const userId = userData.id; // Lưu id vào biến
        setTimeout(() => {
          // Sử dụng biến userId đã được kiểm tra
          router.push(`/profile/${userId}`);
        }, 2000);
      } else {
        console.warn('Không tìm thấy userData.id để chuyển hướng sau khi request artist.');
      }

    } catch (error: any) {
      console.error('Error requesting artist role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to request artist role';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasPendingRequest) {
    return (
      <div className="min-h-screen space-y-8 bg-gradient-to-b from-[#2c2c2c] to-[#121212] text-white flex">
        <div className="bg-black/20 border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm p-8 flex flex-col flex-grow w-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <Button
              variant="secondary"
              asChild
              className="bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
            >
              <Link
                href="/"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              Request to Become an Artist
            </h1>
          </div>

          <div className="flex flex-grow items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4 text-white text-center text-xl">
              <Clock className="w-12 h-12 text-white/50" />
              <span>
                You have already submitted a request to become an artist. Please
                wait for admin approval.
              </span>
              {/* Display submission time if available */}
              {submissionTimestamp && (
                <span className="text-base text-white/60 mt-2">
                  Submitted on:{' '}
                  {new Date(submissionTimestamp).toLocaleString('en-US', { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-gradient-to-b from-[#2c2c2c] to-[#121212] text-white">
      <div className="bg-black/20 border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="secondary"
            asChild
            className="bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
          >
            <Link
              href="/"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Request to Become an Artist
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Integrated Avatar Preview & Upload */}
          <div className="flex flex-col items-center justify-center mb-6 space-y-2">
            <label
              htmlFor="avatar-upload"
              className="block text-sm font-medium text-white/80 cursor-pointer"
            >
            </label>
            <label
              htmlFor="avatar-upload"
              className="relative cursor-pointer group flex items-center justify-center w-40 h-40 rounded-full border-2 border-dashed border-white/20 hover:border-white/50 transition-colors bg-white/[0.03] overflow-hidden"
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar Preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-full" // Ensure image itself is rounded if needed
                />
              ) : (
                <div className="text-center text-white/40 p-4">
                  <ImageIcon className="w-10 h-10 mx-auto mb-1 text-white/30" />
                  <span className="text-xs block">Click to upload</span>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ImageIcon className="w-8 h-8 text-white/80" />
              </div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.size > 5 * 1024 * 1024) {
                  toast.error('File size exceeds the limit of 5MB');
                  e.target.value = ''; // Clear the input
                  setFormData({ ...formData, avatarFile: null });
                  setAvatarPreview(null);
                  return;
                }
                setFormData({
                  ...formData,
                  avatarFile: file || null,
                });
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setAvatarPreview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                } else {
                  setAvatarPreview(null);
                }
              }}
              required
            />
            <p className="text-xs text-muted-foreground pt-1">Upload a profile picture (JPG, PNG, GIF - max 5MB).</p>
          </div>
          <hr className="border-white/[0.1]" />

          <div className="space-y-6">
            <SectionHeading icon={User} title="Artist Details" />
            <div>
              <label
                htmlFor="artistName"
                className="block text-sm font-medium mb-2 text-white/70"
              >
                Artist Name *
              </label>
              <input
                id="artistName"
                type="text"
                value={formData.artistName}
                onChange={(e) =>
                  setFormData({ ...formData, artistName: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40"
                placeholder="Enter your artist name"
                required
              />
            </div>
            <div>
              <label
                htmlFor="label"
                className="block text-sm font-medium mb-2 text-white/70"
              >
                Label *
              </label>
              <input
                id="label"
                type="text"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40"
                placeholder="Your personal label name (e.g., 'My Music Records')"
                required
              />
            </div>
            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium mb-2 text-white/70"
              >
                Bio *
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40 min-h-[120px]"
                rows={4}
                placeholder="Tell us about yourself and your music"
                required
              />
            </div>
          </div>

          <hr className="border-white/[0.1]" />

          {/* Section: Social Links - Moved Up */}
          <div className="space-y-6">
            <SectionHeading icon={Link2} title="Social Links" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="facebookLink"
                  className="block text-sm font-medium mb-2 text-white/70"
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
                  className="w-full px-4 py-2.5 bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40"
                  placeholder="https://www.facebook.com/yourprofile"
                />
              </div>
              <div>
                <label
                  htmlFor="instagramLink"
                  className="block text-sm font-medium mb-2 text-white/70"
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
                  className="w-full px-4 py-2.5 bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40"
                  placeholder="https://www.instagram.com/yourprofile"
                />
              </div>
            </div>
          </div>

          <hr className="border-white/[0.1]" />

          {/* Section: Music Profile - Moved Up */}
          <div className="space-y-6">
            <SectionHeading icon={Music} title="Music Profile" />
            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Genres *</label>
              {/* Apply conditional styling based on genreError */}
              {/* Wrap SearchableSelect for error styling */}
              {/* Ensure this uses genreError */} 
              <div className={cn(genreError && 'rounded-md border border-red-500')}>
                <SearchableSelect
                  options={genreOptions}
                  value={formData.genres}
                  onChange={(selected) => {
                    const newGenres = Array.isArray(selected) ? selected : [selected];
                    setFormData({
                      ...formData,
                      genres: newGenres,
                    });
                  }}
                  placeholder="Select genres "
                  multiple={true}
                />
              </div>
              {/* Show error message only when genreError is set */} 
              {/* Ensure this uses genreError */}
              {genreError ? (
                <p className="text-xs text-red-500 mt-1.5">{genreError}</p>
              ) : (
                null // Render nothing if no error
              )}
            </div>
          </div>

          <hr className="border-white/[0.1]" />

          {error && (
             <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <Info className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.artistName || !formData.bio || !formData.avatarFile || !formData.label}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                  </div>
              ) : (
                 <>
                  <Save className="w-4 h-4" />
                  Submit Request
                 </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
