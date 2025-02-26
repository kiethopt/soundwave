import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { Track, Album, ArtistProfile, User, Genre } from '@/types';
import Image from 'next/image';
import { Facebook, Instagram, Verified } from '../ui/Icons';
import { api } from '@/utils/api';
import { toast } from 'react-toastify';

interface EditTrackModalProps {
  track: Track | null;
  onClose: () => void;
  onSubmit: (trackId: string, formData: FormData) => Promise<void>;
  availableArtists: Array<{ id: string; name: string }>;
  selectedFeaturedArtists: string[];
  setSelectedFeaturedArtists: (artists: string[]) => void;
  availableGenres: Array<{ id: string; name: string }>;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  theme?: 'light' | 'dark';
}

export function EditTrackModal({
  track,
  onClose,
  onSubmit,
  availableArtists,
  selectedFeaturedArtists,
  setSelectedFeaturedArtists,
  availableGenres,
  selectedGenres,
  setSelectedGenres,
  theme = 'light',
}: EditTrackModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!track) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Tạo URL tạm thời để xem trước ảnh
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  // Hàm xử lý khi click vào ảnh cover
  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={!!track} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === 'dark' ? 'bg-[#2a2a2a] border-[#404040]' : 'bg-white'
        } p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Edit Track
          </DialogTitle>
          <DialogDescription
            className={theme === 'dark' ? 'text-white/70' : 'text-gray-500'}
          >
            Make changes to your track information here.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            // Xóa các trường hiện có để tránh trùng lặp
            formData.delete('featuredArtists');
            formData.delete('genreIds');

            // Luôn thêm một trường đánh dấu để backend biết chúng ta đang cố gắng cập nhật
            formData.append('updateFeaturedArtists', 'true');
            formData.append('updateGenres', 'true');

            // Thêm từng featured artist vào formData
            selectedFeaturedArtists.forEach((artistId) => {
              formData.append('featuredArtists', artistId);
            });

            // Thêm từng genre vào formData
            selectedGenres.forEach((genreId) => {
              formData.append('genreIds', genreId);
            });

            onSubmit(track.id, formData);
          }}
          className="space-y-6 mt-4"
        >
          {/* Cover Image */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Cover Image
            </span>
            <div
              className="w-full flex flex-col items-center mb-4"
              onClick={handleCoverClick}
            >
              <div
                className={`w-40 h-40 rounded-md overflow-hidden cursor-pointer border-2 ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                } hover:opacity-90 transition-opacity relative`}
              >
                <img
                  src={
                    previewImage ||
                    track.coverUrl ||
                    'https://placehold.co/150x150?text=No+Cover'
                  }
                  alt="Track cover"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback nếu hình ảnh không load được
                    e.currentTarget.src =
                      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%20viewBox%3D%220%200%20150%20150%22%3E%3Crect%20fill%3D%22%23ccc%22%20width%3D%22150%22%20height%3D%22150%22%2F%3E%3Ctext%20fill%3D%22%23666%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20dy%3D%22.5em%22%20text-anchor%3D%22middle%22%20x%3D%2275%22%20y%3D%2275%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
                  }}
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity text-white`}
                >
                  <span>Change Cover</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="coverFile"
                name="coverFile"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span
                className={`mt-2 text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Click to upload new cover image
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Title
            </span>
            <Input
              id="title"
              name="title"
              defaultValue={track.title}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white placeholder-gray-400 focus:border-white/50'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'
              } transition-colors focus:outline-none`}
              placeholder="Enter track title"
            />
          </div>

          {/* Type (disabled SINGLE) */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Type
            </span>
            <Input
              id="type"
              value="SINGLE"
              disabled
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white/70 placeholder-gray-400'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              } transition-colors focus:outline-none cursor-not-allowed`}
            />
            <input type="hidden" name="type" value="SINGLE" />
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Release Date
            </span>
            <Input
              id="releaseDate"
              name="releaseDate"
              type="datetime-local"
              defaultValue={(() => {
                const date = new Date(track.releaseDate);
                return date
                  .toLocaleString('sv', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: undefined,
                  })
                  .replace(' ', 'T');
              })()}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white focus:border-white/50'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'
              } transition-colors focus:outline-none`}
            />
          </div>

          {/* Featured Artists */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Featured Artists
            </span>
            <SearchableSelect
              options={availableArtists}
              value={selectedFeaturedArtists}
              onChange={setSelectedFeaturedArtists}
              placeholder="Select featured artists..."
              multiple={true}
              required={false}
            />
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Genres
            </span>
            <SearchableSelect
              options={availableGenres}
              value={selectedGenres}
              onChange={setSelectedGenres}
              placeholder="Select genres..."
              multiple={true}
              required={false}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === 'dark'
                  ? 'border-white/50 text-white hover:bg-white/10'
                  : ''
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                theme === 'dark' ? 'bg-white text-black hover:bg-white/90' : ''
              }
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditAlbumModalProps {
  album: Album | null;
  onClose: () => void;
  onSubmit: (albumId: string, formData: FormData) => Promise<void>;
  availableGenres: Array<{ id: string; name: string }>;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  theme?: 'light' | 'dark';
}

export function EditAlbumModal({
  album,
  onClose,
  onSubmit,
  availableGenres,
  selectedGenres,
  setSelectedGenres,
  theme = 'light',
}: EditAlbumModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!album) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Tạo URL tạm thời để xem trước ảnh
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  // Hàm xử lý khi click vào ảnh cover
  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={!!album} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === 'dark' ? 'bg-[#2a2a2a] border-[#404040]' : 'bg-white'
        } p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Edit Album
          </DialogTitle>
          <DialogDescription
            className={theme === 'dark' ? 'text-white/70' : 'text-gray-500'}
          >
            Make changes to your album information here.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            // Xóa các trường hiện có để tránh trùng lặp
            formData.delete('genres');

            // Luôn thêm một trường đánh dấu để backend biết mình đang cố gắng cập nhật
            formData.append('updateGenres', 'true');

            // Thêm từng genre vào formDataType
            selectedGenres.forEach((genreId) => {
              formData.append('genres', genreId);
            });

            onSubmit(album.id, formData);
          }}
          className="space-y-6 mt-4"
        >
          {/* Cover Image */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Cover Image
            </span>
            <div
              className="w-full flex flex-col items-center mb-4"
              onClick={handleCoverClick}
            >
              <div
                className={`w-40 h-40 rounded-md overflow-hidden cursor-pointer border-2 ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                } hover:opacity-90 transition-opacity relative`}
              >
                <img
                  src={
                    previewImage ||
                    album.coverUrl ||
                    'https://placehold.co/150x150?text=No+Cover'
                  }
                  alt="Album cover"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback nếu hình ảnh không load được
                    e.currentTarget.src =
                      'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%20viewBox%3D%220%200%20150%20150%22%3E%3Crect%20fill%3D%22%23ccc%22%20width%3D%22150%22%20height%3D%22150%22%2F%3E%3Ctext%20fill%3D%22%23666%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20dy%3D%22.5em%22%20text-anchor%3D%22middle%22%20x%3D%2275%22%20y%3D%2275%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
                  }}
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity text-white`}
                >
                  <span>Change Cover</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="coverFile"
                name="coverFile"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span
                className={`mt-2 text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Click to upload new cover image
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Title
            </span>
            <Input
              id="title"
              name="title"
              defaultValue={album.title}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white placeholder-gray-400 focus:border-white/50'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'
              } transition-colors focus:outline-none`}
              placeholder="Enter album title"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Type
            </span>
            <select
              id="type"
              name="type"
              defaultValue={album.type}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white placeholder-gray-400 focus:border-white/50'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'
              } transition-colors focus:outline-none`}
            >
              <option value="ALBUM">Album</option>
              <option value="EP">EP</option>
            </select>
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Release Date
            </span>
            <Input
              id="releaseDate"
              name="releaseDate"
              type="datetime-local"
              defaultValue={(() => {
                const date = new Date(album.releaseDate);
                return date
                  .toLocaleString('sv', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: undefined,
                  })
                  .replace(' ', 'T');
              })()}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white focus:border-white/50'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'
              } transition-colors focus:outline-none`}
            />
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Genres
            </span>
            <SearchableSelect
              options={availableGenres}
              value={selectedGenres}
              onChange={setSelectedGenres}
              placeholder="Select genres..."
              multiple={true}
              required={false}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === 'dark'
                  ? 'border-white/50 text-white hover:bg-white/10'
                  : ''
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                theme === 'dark' ? 'bg-white text-black hover:bg-white/90' : ''
              }
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ArtistInfoModalProps {
  artist: {
    id: string;
    artistName: string;
    bio?: string;
    avatar?: string;
    socialMediaLinks?: {
      spotify?: string;
      youtube?: string;
      instagram?: string;
      twitter?: string;
      facebook?: string;
    };
    monthlyListeners?: number;
    isVerified?: boolean;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export function ArtistInfoModal({
  artist,
  isOpen,
  onClose,
  theme = 'light',
}: ArtistInfoModalProps) {
  if (!artist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full sm:max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden',
            theme === 'dark' ? 'bg-[#2a2a2a] border-[#404040]' : 'bg-white'
          )}
        >
          <DialogHeader>
            <DialogTitle className="sr-only">Artist Information</DialogTitle>
            <DialogDescription className="sr-only">
              Details about the artist
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              {artist.avatar ? (
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={artist.avatar}
                    alt={artist.artistName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {artist.artistName?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-1">
                  <h3
                    className={`text-xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {artist.artistName}
                  </h3>
                  {artist.isVerified && (
                    <Verified
                      className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {artist.monthlyListeners
                    ? artist.monthlyListeners.toLocaleString()
                    : '0'}{' '}
                  monthly listeners
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p
                className={`text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {artist.bio || 'No bio available'}
              </p>
            </div>

            {(artist.socialMediaLinks?.facebook ||
              artist.socialMediaLinks?.instagram) && (
              <div className="flex gap-3">
                {artist.socialMediaLinks?.facebook && (
                  <a
                    href={
                      artist.socialMediaLinks.facebook.startsWith('http')
                        ? artist.socialMediaLinks.facebook
                        : `https://www.facebook.com/${artist.socialMediaLinks.facebook}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-500 hover:text-blue-600 flex items-center gap-1`}
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {artist.socialMediaLinks?.instagram && (
                  <a
                    href={
                      artist.socialMediaLinks.instagram.startsWith('http')
                        ? artist.socialMediaLinks.instagram
                        : `https://www.instagram.com/${artist.socialMediaLinks.instagram}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-pink-500 hover:text-pink-600 flex items-center gap-1`}
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}

            {/* Nút Close ở góc dưới bên phải */}
            <div className="flex justify-end mt-4">
              <Button
                onClick={onClose}
                variant="outline"
                className={`${
                  theme === 'dark'
                    ? 'border-gray-600 text-black hover:bg-gray-300'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

interface EditArtistModalProps {
  artist: ArtistProfile | null;
  onClose: () => void;
  onUpdate: (updatedArtist: Partial<ArtistProfile>) => void;
  theme?: 'light' | 'dark';
}

export function EditArtistModal({
  artist,
  onClose,
  onUpdate,
  theme = 'light',
}: EditArtistModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(
    artist?.avatar || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!artist) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.updateArtist(artist.id, formData, token);
      onUpdate(response.artist);
      onClose();
      toast.success('Artist updated successfully');
    } catch (error) {
      console.error('Error updating artist:', error);
      toast.error('Failed to update artist');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={!!artist} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === 'dark' ? 'bg-[#2a2a2a] border-[#404040]' : 'bg-white'
        } p-6 rounded-lg shadow-lg max-w-lg w-full`}
      >
        <DialogHeader>
          <DialogTitle
            className={theme === 'dark' ? 'text-white' : 'text-gray-900'}
          >
            Edit Artist
          </DialogTitle>
          <DialogDescription
            className={theme === 'dark' ? 'text-white/70' : 'text-gray-500'}
          >
            Update artist details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Avatar */}
          <div className="space-y-2">
            <label
              htmlFor="avatar"
              className={theme === 'dark' ? 'text-white' : 'text-gray-700'}
            >
              Avatar
            </label>
            <div className="flex items-center gap-4">
              <img
                src={
                  previewImage || 'https://placehold.co/150x150?text=No+Cover'
                }
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              />
              <input
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className={theme === 'dark' ? 'text-white border-white/50' : ''}
              >
                Change Avatar
              </Button>
            </div>
          </div>

          {/* Artist Name */}
          <div className="space-y-2">
            <label
              htmlFor="artistName"
              className={theme === 'dark' ? 'text-white' : 'text-gray-700'}
            >
              Artist Name
            </label>
            <Input
              id="artistName"
              name="artistName"
              defaultValue={artist.artistName}
              required
              className={theme === 'dark' ? 'bg-[#3a3a3a] text-white' : ''}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label
              htmlFor="bio"
              className={theme === 'dark' ? 'text-white' : 'text-gray-700'}
            >
              Bio
            </label>
            <Input
              id="bio"
              name="bio"
              defaultValue={artist.bio || ''}
              className={theme === 'dark' ? 'bg-[#3a3a3a] text-white' : ''}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={theme === 'dark' ? 'text-white border-white/50' : ''}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              className={theme === 'dark' ? 'bg-white text-black' : ''}
            >
              {isUploading ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditUserModalProps {
  user: User | null;
  onClose: () => void;
  onSubmit: (userId: string, formData: FormData) => Promise<void>;
  theme?: 'light' | 'dark';
}

export function EditUserModal({
  user,
  onClose,
  onSubmit,
  theme = 'light',
}: EditUserModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === 'dark' ? 'bg-[#2a2a2a] border-[#404040]' : 'bg-white'
        } p-6 rounded-lg shadow-lg max-w-2xl w-full`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Edit User
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onSubmit(user.id, formData);
          }}
          className="space-y-6 mt-4"
        >
          {/* Avatar */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Avatar
            </span>
            <div
              className="w-full flex flex-col items-center mb-4"
              onClick={handleCoverClick}
            >
              <div
                className={`w-32 h-32 rounded-full overflow-hidden cursor-pointer border-2 ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                } hover:opacity-90 transition-opacity relative`}
              >
                <img
                  src={
                    previewImage ||
                    user.avatar ||
                    'https://placehold.co/150x150?text=No+Avatar'
                  }
                  alt="User avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Name
            </span>
            <Input
              id="name"
              name="name"
              defaultValue={user.name || ''}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Username
            </span>
            <Input
              id="username"
              name="username"
              defaultValue={user.username || ''}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Email
            </span>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditGenreModalProps {
  genre: Genre | null;
  onClose: () => void;
  onSubmit: (genreId: string, formData: FormData) => Promise<void>;
  theme?: 'light' | 'dark';
}

export function EditGenreModal({
  genre,
  onClose,
  onSubmit,
  theme = 'light',
}: EditGenreModalProps) {
  if (!genre) return null;

  return (
    <Dialog open={!!genre} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === 'dark' ? 'bg-[#2a2a2a] border-[#404040]' : 'bg-white'
        } p-6 rounded-lg shadow-lg max-w-md w-full`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Edit Genre
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onSubmit(genre.id, formData);
          }}
          className="space-y-4 mt-4"
        >
          <div className="space-y-2">
            <label
              htmlFor="name"
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Name
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={genre.name}
              required
              maxLength={50}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={theme === 'dark' ? 'text-white border-white/50' : ''}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={theme === 'dark' ? 'bg-white text-black' : ''}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
