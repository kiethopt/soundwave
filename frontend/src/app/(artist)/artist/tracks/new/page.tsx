'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api'; // Đảm bảo api.labels đã được định nghĩa ở đây
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect'; // Component chọn có tìm kiếm
import { ArtistProfile } from '@/types';

// Định nghĩa kiểu dữ liệu cho Label (nếu chưa có)
interface Label {
  id: string;
  name: string;
}

export default function NewTrack() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [trackData, setTrackData] = useState({
    title: '',
    type: 'SINGLE',
    releaseDate: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [availableArtists, setAvailableArtists] = useState<Array<{ id: string; name: string }>>([]);
  const [featuredArtists, setFeaturedArtists] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: string; name: string }>>([]);
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

        // --- Fetch thêm danh sách Labels ---
        const [artistsResponse, genresResponse, labelsResponse] = await Promise.all([
          api.artists.getAllArtistsProfile(token, 1, 100),
          api.genres.getAll(token, 1, 100),
          api.labels.getAll(token, 1, 100), // Giả sử API này tồn tại và trả về { labels: [...] }
        ]);
        // --- Kết thúc Fetch thêm danh sách Labels ---

        setAvailableArtists(
          artistsResponse.artists.map((artist: ArtistProfile) => ({
            id: artist.id,
            name: artist.artistName,
          }))
        );

        setAvailableGenres(
          genresResponse.genres.map((genre: { id: string; name: string }) => ({
            id: genre.id,
            name: genre.name,
          }))
        );

        // --- Cập nhật State cho Labels ---
        setAvailableLabels(
          labelsResponse.labels.map((label: Label) => ({ // Sử dụng interface Label đã định nghĩa
            id: label.id,
            name: label.name,
          }))
        );
        // --- Kết thúc Cập nhật State cho Labels ---

      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load required data (artists, genres, or labels)');
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTrackData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (e.target.name === 'audio') {
        setAudioFile(e.target.files[0]);
      } else if (e.target.name === 'cover' && e.target.files.length > 0) {
        const file = e.target.files[0];
        setCoverFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);
        // Clean up previous object URL if exists to prevent memory leaks
        if (previewImage && previewImage.startsWith('blob:')) {
          URL.revokeObjectURL(previewImage);
        }
      }
    }
  };


  // Hàm xử lý khi nhấn vào ảnh bìa để mở input file
  const handleCoverClick = () => {
    coverFileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audioFile) {
      toast.error('Please select an audio file');
      return;
    }

    if (selectedGenres.length === 0) {
      toast.error('Please select at least one genre');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', trackData.title);
      formData.append('type', 'SINGLE'); // Type vẫn đang là SINGLE
      formData.append('releaseDate', trackData.releaseDate);
      formData.append('audioFile', audioFile); // Đã kiểm tra nên audioFile không null

      if (coverFile) {
        formData.append('coverFile', coverFile);
      } else {
        toast('No cover image selected. You can update it later.');
      }

      featuredArtists.forEach((artistId) => {
        formData.append('featuredArtists[]', artistId);
      });

      selectedGenres.forEach((genreId) => {
        formData.append('genreIds[]', genreId);
      });

      // --- Thêm labelId vào FormData nếu đã chọn ---
      if (selectedLabelId) {
        formData.append('labelId', selectedLabelId);
      }
      // --- Kết thúc thêm labelId ---

      await api.tracks.create(formData, token); // Gọi API tạo track
      toast.success('Track created successfully');
      router.push('/artist/tracks'); // Điều hướng sau khi tạo thành công
    } catch (error) {
      console.error('Error creating track:', error);
      // Cung cấp thông báo lỗi cụ thể hơn nếu có thể
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to create track';
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
          {/* Back Button */}
          <div className="w-fit">
            <Link
              href="/artist/tracks"
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
                  value={trackData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                    ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                    : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
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
                  value="SINGLE" // Chỉ cho phép chọn Single trong form này
                  disabled // Vô hiệu hóa không cho thay đổi
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 appearance-none ${ // Thêm appearance-none để tùy chỉnh giao diện dễ hơn nếu muốn
                    theme === 'light'
                      ? 'bg-gray-100 border-gray-300 focus:ring-blue-500/20 text-gray-500' // Đổi màu nền và chữ khi disabled
                      : 'bg-white/[0.05] border-white/[0.1] focus:ring-white/20 text-white/50' // Đổi màu nền và chữ khi disabled
                    }`}
                >
                  <option
                    value="SINGLE"
                    className={
                      theme === 'dark' ? 'bg-[#121212] text-white' : ''
                    }
                  >
                    Single
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
                  value={trackData.releaseDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                    ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                    : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
                    } ${theme === 'dark' ? 'date-input-dark' : ''}`} // Thêm class để style riêng cho dark mode nếu cần
                  required
                />
              </div>

              {/* Featured Artists */}
              <div className="space-y-2">
                <label
                  htmlFor="featuredArtists"
                  className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                >
                  Featured Artists
                </label>
                <SearchableSelect
                  options={availableArtists}
                  value={featuredArtists}
                  onChange={setFeaturedArtists}
                  placeholder="Select featured artists..."
                  multiple={true}
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
                  required={true} // Đánh dấu là bắt buộc
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
                {/* Sử dụng SearchableSelect cho nhất quán, nhưng đặt multiple={false} */}
                <SearchableSelect
                  options={availableLabels}
                  // SearchableSelect có thể trả về mảng kể cả khi multiple=false,
                  // nên cần xử lý lấy phần tử đầu tiên hoặc null.
                  // value cần là mảng chứa ID hoặc mảng rỗng.
                  value={selectedLabelId ? [selectedLabelId] : []}
                  onChange={(selectedIds) => {
                    // Giả sử onChange luôn trả về mảng ID. Lấy phần tử đầu tiên.
                    // Kiểm tra lại cách component SearchableSelect hoạt động với single select.
                    setSelectedLabelId(selectedIds.length > 0 ? selectedIds[0] : null);
                  }}
                  placeholder="Select a label..."
                  multiple={false} // Chỉ cho phép chọn một label
                />
                {/* Hoặc dùng select HTML tiêu chuẩn nếu đơn giản hơn */}
                {/*
                 <select
                   id="label"
                   name="label"
                   value={selectedLabelId || ''} // Giá trị là ID hoặc chuỗi rỗng
                   onChange={(e) => setSelectedLabelId(e.target.value || null)} // Cập nhật state, đặt null nếu chọn giá trị rỗng
                   className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 appearance-none ${
                     theme === 'light'
                       ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                       : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
                   }`}
                 >
                   <option value="" className={theme === 'dark' ? 'bg-[#121212] text-white' : ''}>
                     -- Select a Label (Optional) --
                   </option>
                   {availableLabels.map((label) => (
                     <option key={label.id} value={label.id} className={theme === 'dark' ? 'bg-[#121212] text-white' : ''}>
                       {label.name}
                     </option>
                   ))}
                 </select>
                 */}
              </div>
              {/* --- Kết thúc thêm trường chọn Label --- */}

              {/* Audio File */}
              <div className="space-y-2">
                <label
                  htmlFor="audio"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Audio File *
                </label>
                <input
                  type="file"
                  id="audio"
                  name="audio"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className={`w-full text-sm rounded-lg border cursor-pointer focus:outline-none ${theme === 'light'
                    ? 'text-gray-900 border-gray-300 bg-gray-50 focus:border-blue-500'
                    : 'text-gray-400 border-gray-600 bg-gray-700 placeholder-gray-400 focus:border-blue-500' // Style cho input file
                    } file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${ // Style phần button của input file
                    theme === 'light' ? 'file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200' : 'file:bg-white/10 file:text-white/80 hover:file:bg-white/20'
                    }`}
                  required
                />
                {audioFile && <span className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{audioFile.name}</span>}
              </div>

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
                  className="w-full flex flex-col items-center mb-4 cursor-pointer"
                  onClick={handleCoverClick} // Cho phép click vào khu vực này để chọn file
                >
                  <div
                    className={`w-40 h-40 rounded-md overflow-hidden border-2 flex items-center justify-center ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
                      } hover:opacity-90 transition-opacity relative group`} // Thêm group cho hover effect
                  >
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Track cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs text-center p-2`}>
                        Click to upload cover
                      </span>
                    )}
                    {/* Lớp phủ hiển thị khi hover */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm`}
                    >
                      Choose Cover
                    </div>
                  </div>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    id="cover"
                    name="cover"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden" // Ẩn input gốc
                  />
                  {/* Hiển thị tên file đã chọn nếu có */}
                  {coverFile && <span className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{coverFile.name}</span>}
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
                  {isLoading ? 'Creating...' : 'Create Track'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Optional: Add specific styles for dark mode date input if needed in your global CSS
/*
.date-input-dark::-webkit-calendar-picker-indicator {
    filter: invert(1);
}
*/