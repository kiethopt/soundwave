'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

// Định nghĩa kiểu dữ liệu cho Label
interface Label {
  id: string;
  name: string;
}

export default function NewAlbum() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [albumData, setAlbumData] = useState({
    title: '',
    type: 'ALBUM',
    releaseDate: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  // --- Thêm State cho Label ---
  const [availableLabels, setAvailableLabels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null); // Lưu ID label được chọn (null nếu không chọn)
  // --- Kết thúc thêm State cho Label ---
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const [genresResponse, labelsResponse] = await Promise.all([
          api.artists.getAllGenres(token, 1, 100),
          api.labels.getAll(token, 1, 100), // Giả sử API này tồn tại và trả về { labels: [...] }
        ]);

        setAvailableGenres(
          genresResponse.genres.map((genre: { id: string; name: string }) => ({
            id: genre.id,
            name: genre.name,
          }))
        );

        // --- Cập nhật State cho Labels ---
        setAvailableLabels(
          labelsResponse.labels.map((label: Label) => ({
            id: label.id,
            name: label.name,
          }))
        );
        // --- Kết thúc Cập nhật State cho Labels ---
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load required data (genres or labels)');
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAlbumData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCoverFile(file);
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedGenres.length === 0) {
      toast.error('Please select at least one genre');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', albumData.title);
      formData.append('type', albumData.type);
      formData.append('releaseDate', albumData.releaseDate);

      if (coverFile) {
        formData.append('coverFile', coverFile);
      } else {
        toast('No cover image selected. You can update it later.');
      }

      selectedGenres.forEach((genreId) => {
        formData.append('genres', genreId);
      });

      // --- Thêm labelId vào FormData nếu đã chọn ---
      if (selectedLabelId) {
        formData.append('labelId', selectedLabelId);
      }
      // --- Kết thúc thêm labelId ---

      await api.albums.create(formData, token);
      toast.success('Album created successfully');
      router.push('/artist/albums');
    } catch (error) {
      console.error('Error creating album:', error);
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to create album';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="container mx-auto mb-16 md:mb-0 p-4"
      suppressHydrationWarning
    >
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="w-fit">
            <Link
              href="/artist/albums"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
                }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
          </div>
        </div>

        {/* Main Form Card */}
        <div
          className={`rounded-xl p-6 border ${theme === 'light'
            ? 'bg-white border-gray-200'
            : 'bg-[#121212] border-gray-800'
            }`}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={albumData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                    ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                    : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                    }`}
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label
                  htmlFor="type"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={albumData.type}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                    ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                    : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
                    }`}
                >
                  <option
                    value="ALBUM"
                    className={theme === 'dark' ? 'bg-[#121212] text-white' : ''}
                  >
                    Album
                  </option>
                  <option
                    value="EP"
                    className={theme === 'dark' ? 'bg-[#121212] text-white' : ''}
                  >
                    EP
                  </option>
                </select>
              </div>

              {/* Release Date & Time */}
              <div className="space-y-2">
                <label
                  htmlFor="releaseDate"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Release Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="releaseDate"
                  name="releaseDate"
                  value={albumData.releaseDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                    ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                    : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                    }`}
                  required
                />
              </div>

              {/* Genres */}
              <div className="space-y-2">
                <label
                  htmlFor="genres"
                  className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                >
                  Genres *
                </label>
                <SearchableSelect
                  options={availableGenres}
                  value={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Select genres..."
                  multiple={true}
                  required={true}
                />
              </div>

              {/* --- Thêm trường chọn Label --- */}
              <div className="space-y-2">
                <label
                  htmlFor="label"
                  className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                >
                  Label
                </label>
                <SearchableSelect
                  options={availableLabels}
                  value={selectedLabelId ? [selectedLabelId] : []}
                  onChange={(selectedIds) => {
                    setSelectedLabelId(selectedIds.length > 0 ? selectedIds[0] : null);
                  }}
                  placeholder="Select a label..."
                  multiple={false} // Chỉ cho phép chọn một label
                />
              </div>
              {/* --- Kết thúc thêm trường chọn Label --- */}

              {/* Cover Image */}
              <div className="space-y-2">
                <label
                  htmlFor="cover"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Cover Image (Optional)
                </label>
                <div
                  className="w-full flex flex-col items-center mb-4"
                  onClick={handleCoverClick}
                >
                  <div
                    className={`w-40 h-40 rounded-md overflow-hidden cursor-pointer border-2 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                      } hover:opacity-90 transition-opacity relative`}
                  >
                    <img
                      src={
                        previewImage ||
                        'https://placehold.co/150x150?text=No+Cover'
                      }
                      alt="Album cover"
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity text-white`}
                    >
                      <span>Choose Cover</span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="cover"
                    name="cover"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span
                    className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                  >
                    Click to upload cover image
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${theme === 'light'
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-white text-[#121212] hover:bg-white/90'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? 'Creating...' : 'Create Album'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}