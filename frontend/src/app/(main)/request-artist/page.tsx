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
import { Checkbox } from '@/components/ui/checkbox';
import { useTheme } from '@/contexts/ThemeContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const SectionHeading = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <Icon className="w-5 h-5 text-white/60" />
    <h2 className="text-lg font-semibold text-white/90">{title}</h2>
  </div>
);

interface SocialLink {
  platform: string;
  url: string;
}

interface FormDataState {
  artistName: string;
  bio: string;
  label: string;
  facebookLink: string;
  instagramLink: string;
  genres: string[];
  avatarFile: File | null;
  socialLinks: SocialLink[];
  agreements: {
    terms: boolean;
    accuracy: boolean;
  };
  requestedLabelName?: string;
}

export default function RequestArtistPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [formData, setFormData] = useState<FormDataState>({
    artistName: '',
    bio: '',
    label: '',
    facebookLink: 'https://www.facebook.com/',
    instagramLink: 'https://www.instagram.com/',
    genres: [],
    avatarFile: null,
    socialLinks: [{ platform: '', url: '' }],
    agreements: {
      terms: false,
      accuracy: false,
    },
    requestedLabelName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [genreOptions, setGenreOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [genreError, setGenreError] = useState<string | null>(null);
  const [submissionTimestamp, setSubmissionTimestamp] = useState<number | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const storedPending = localStorage.getItem('hasPendingRequest');
    const storedTimestamp = localStorage.getItem('submissionTimestamp');
    setHasPendingRequest(storedPending ? JSON.parse(storedPending) : false);
    setSubmissionTimestamp(storedTimestamp ? JSON.parse(storedTimestamp) : null);
  }, []);

  useEffect(() => {
    const socket = getSocket();

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

    return () => {
      console.log('Cleaning up Request Artist page socket listener');
      socket.off('artist-request-status', handleArtistRequestStatus);
    };
  }, []);

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

        if (user && user.artistProfile && user.artistProfile.isActive) {
            console.log('User đã là Artist active, chuyển hướng...');
            router.push(`/artist/profile/${user.artistProfile.id}`);
            return;
        }

        const token = localStorage.getItem('userToken');
        if (!token) {
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
      }
    };

    checkPendingRequest();
  }, [router]);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGenreChange = (selectedGenreIds: string[]) => {
    setFormData((prev) => ({ ...prev, genres: selectedGenreIds }));
    setGenreError(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Avatar file size exceeds the limit of 5MB');
        setAvatarPreview(null);
        setFormData((prev) => ({ ...prev, avatarFile: null }));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setFormData((prev) => ({ ...prev, avatarFile: file }));
    } else {
      setAvatarPreview(null);
      setFormData((prev) => ({ ...prev, avatarFile: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setGenreError(null);

    if (formData.genres.length === 0) {
        setGenreError('This field is required');
        toast.error('Please select at least one genre.');
        return;
    } 

    if (!agreedToTerms) {
      toast.error('You must agree to the Terms of Use.');
      setError('Please agree to the Terms of Use to continue.');
      return;
    }

    setIsSubmitting(true);

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

      if (!userData) {
          throw new Error('Failed to load user data.');
      }

      if (formData.avatarFile && formData.avatarFile.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds the limit of 5MB');
      }

      const submitFormData = new FormData();
      submitFormData.append('artistName', formData.artistName);
      submitFormData.append('bio', formData.bio);
      submitFormData.append('genres', formData.genres.join(','));
      if (formData.requestedLabelName) {
        submitFormData.append('requestedLabelName', formData.requestedLabelName);
      }

      const socialMediaLinks = {
        ...(formData.facebookLink !== 'https://www.facebook.com/' && { facebook: formData.facebookLink }),
        ...(formData.instagramLink !== 'https://www.instagram.com/' && { instagram: formData.instagramLink }),
      };
      submitFormData.append('socialMediaLinks', JSON.stringify(socialMediaLinks));

      if (formData.avatarFile) {
        submitFormData.append('avatar', formData.avatarFile);
      }

      await api.user.requestArtistRole(token, submitFormData);

      const timestamp = Date.now();
      setHasPendingRequest(true);
      setSubmissionTimestamp(timestamp);
      localStorage.setItem('hasPendingRequest', JSON.stringify(true));
      localStorage.setItem('submissionTimestamp', JSON.stringify(timestamp));
      toast.success('Your request has been submitted successfully!', { duration: 2000 });

      if (userData?.id) {
        const userId = userData.id;
        setTimeout(() => {
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
            onClick={() => router.back()}
            className="bg-neutral-700 hover:bg-neutral-600 text-neutral-100 flex items-center gap-2"
            type="button"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Request to Become an Artist
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
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
                  className="rounded-full"
                />
              ) : (
                <div className="text-center text-white/40 p-4">
                  <ImageIcon className="w-10 h-10 mx-auto mb-1 text-white/30" />
                  <span className="text-xs block">Click to upload</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ImageIcon className="w-8 h-8 text-white/80" />
              </div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              required
            />
            <p className="text-xs text-muted-foreground pt-1">Upload a profile picture (JPG, PNG, GIF - max 5MB).</p>
          </div>
          <hr className="border-white/[0.1]" />

          <div className="space-y-6">
            <SectionHeading icon={User} title="Artist Details" />
            <div className="space-y-1.5">
              <Label htmlFor="artistName" className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>
                Artist Name *
              </Label>
              <Input
                id="artistName"
                name="artistName"
                value={formData.artistName}
                onChange={handleChange}
                placeholder="Your stage name"
                required
                className="bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40 "
                />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requestedLabelName" className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>
                Proposed Label Name (Optional)
              </Label>
              <Input
                id="requestedLabelName"
                name="requestedLabelName"
                value={formData.requestedLabelName || ''}
                onChange={handleChange}
                placeholder="Your label name (if any)"
                className="bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40 "
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
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40 min-h-[120px]"
                rows={4}
                placeholder="Tell us about yourself and your music"
                required
              />
            </div>
          </div>

          <hr className="border-white/[0.1]" />

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
                  name="facebookLink"
                  type="url"
                  value={formData.facebookLink}
                  onChange={handleChange}
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
                  name="instagramLink"
                  type="url"
                  value={formData.instagramLink}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white/[0.05] rounded-lg border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-colors placeholder-white/40"
                  placeholder="https://www.instagram.com/yourprofile"
                />
              </div>
            </div>
          </div>

          <hr className="border-white/[0.1]" />

          <div className="space-y-6">
            <SectionHeading icon={Music} title="Music Profile" />
            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Genres *</label>
              <div className={cn(genreError && 'rounded-md border border-red-500')}>
                <SearchableSelect
                  options={genreOptions}
                  value={formData.genres}
                  onChange={handleGenreChange}
                  placeholder="Select genres "
                  multiple={true}
                />
              </div>
              {genreError ? (
                <p className="text-xs text-red-500 mt-1.5">{genreError}</p>
              ) : (
                null
              )}
            </div>
          </div>

          <hr className="border-white/[0.1]" />

          <div className="flex items-start space-x-3 mt-6">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              className="mt-1 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white/80 cursor-pointer"
              >
                I agree to the Terms of Use *
              </label>
              <p className="text-xs text-muted-foreground">
                By submitting, you confirm that you own the rights to your music or have been granted the necessary permissions.
              </p>
            </div>
          </div>

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
              disabled={isSubmitting || !formData.artistName || !formData.bio || !formData.avatarFile || !agreedToTerms}
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
