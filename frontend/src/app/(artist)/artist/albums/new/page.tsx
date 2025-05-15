'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

// Định nghĩa kiểu dữ liệu cho Label
interface Label {
  id: string;
  name: string;
}

export default function NewAlbum() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  // Helper function to get current date and time in YYYY-MM-DDTHH:MM format
  const getCurrentDateTime = () => {
    const now = new Date();
    // Adjust for local timezone
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    return localNow.toISOString().slice(0, 16);
  };

  const [albumData, setAlbumData] = useState({
    title: '',
    type: 'ALBUM',
    releaseDate: getCurrentDateTime(), // Set current date and time as default
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  // State to store the artist's default label name
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);

  useEffect(() => {
    // Fetch genres and artist profile data
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          toast.error("Authentication required. Please log in.");
          router.push('/login'); // Redirect to login if no token
          return;
        };

        // Fetch genres and artist profile in parallel
        const [genresResponse, profileResponse, selectableLabelsResponse] = await Promise.all([
          api.artists.getAllGenres(token, 1, 100),
          api.auth.getMe(token), // Use getMe to fetch profile
          api.labels.getSelectableByArtist(token)
        ]);

        // Set Genres
        setAvailableGenres(
          genresResponse.genres.map((genre: { id: string; name: string }) => ({
            id: genre.id,
            name: genre.name,
          }))
        );

        // Set available labels for selection
        if (selectableLabelsResponse && selectableLabelsResponse.data) { // Assuming response is { data: Label[] }
          setAvailableLabels(selectableLabelsResponse.data.map((label: Label) => ({ id: label.id, name: label.name })));
        }

        // Pre-select artist's own label if it exists
        if (profileResponse?.artistProfile?.label?.id) {
          setSelectedLabel(profileResponse.artistProfile.label.id);
        } else {
          setSelectedLabel(null);
        }

      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        toast.error('Failed to load required data (genres or profile)');
      }
    };

    fetchData();
  }, [router]); // Add router to dependencies

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
      // Clean up previous object URL if exists
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
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

      if (selectedLabel) {
        formData.append('labelId', selectedLabel);
      }

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
        <div className="flex items-center justify-between gap-4 mb-4">
           <Button
             variant="outline"
             size="default"
             onClick={() => router.push('/artist/albums')}
             className={cn(theme === 'dark' ? 'border-white/20 hover:bg-white/10' : '')}
           >
             <ArrowLeft className="mr-2 h-4 w-4" />
             Back to Albums
           </Button>
           <h1 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create New Album/EP</h1>
           <div className="w-[150px]"></div>
        </div>

        {/* Main Form Card */}
        <div
          className={`rounded-xl p-6 md:p-8 border ${theme === 'light'
            ? 'bg-white border-gray-200'
            : 'bg-[#181818] border-gray-700/50'
            }`}
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* --- Left Column: Cover Art --- */}
            <div className="md:col-span-1 space-y-2 flex flex-col items-center md:items-start">
               <UILabel
                 htmlFor="cover-upload-area"
                 className={cn(
                   "self-start text-sm font-medium mb-1",
                   theme === 'light' ? 'text-gray-700' : 'text-white/80'
                 )}
               >
                 Cover Image (Optional)
               </UILabel>
               <div
                 id="cover-upload-area"
                 className={cn(
                   "w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group",
                   theme === "dark" ? "border-gray-600 hover:border-gray-500 bg-white/5" : "border-gray-300 hover:border-gray-400 bg-gray-50"
                 )}
                 onClick={handleCoverClick}
               >
                 {previewImage ? (
                   <img src={previewImage} alt="Album cover preview" className="w-full h-full object-cover" />
                 ) : (
                   <div className="text-center p-4">
                     <Upload className={cn("h-16 w-16 mx-auto mb-3", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                     <p className={cn("font-medium", theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>Click to upload cover</p>
                     <p className={cn("text-xs mt-1", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>PNG, JPG, GIF up to 10MB</p>
                   </div>
                 )}
                 <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-white text-sm font-medium">{previewImage ? 'Change Cover' : 'Upload Cover'}</p>
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
                {coverFile && <span className={`mt-1 text-xs self-center md:self-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{coverFile.name}</span>}
            </div>

             {/* --- Right Column: Album Details --- */}
            <div className="md:col-span-2 space-y-5">
               {/* Title */}
               <div className="space-y-1.5">
                 <UILabel htmlFor="title" className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>Title *</UILabel>
                 <Input
                   type="text"
                   id="title"
                   name="title"
                   value={albumData.title}
                   onChange={handleInputChange}
                   className={cn(theme === 'light' ? 'bg-white border-gray-300' : 'bg-white/[0.07] border-white/[0.1]')}
                   required
                 />
               </div>

               {/* Type */}
               <div className="space-y-1.5">
                 <UILabel htmlFor="type" className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>Type *</UILabel>
                 <select
                   id="type"
                   name="type"
                   value={albumData.type}
                   onChange={handleInputChange}
                   className={cn(
                      'w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-1 appearance-none',
                      theme === 'light'
                        ? 'bg-white border-gray-300 focus:ring-blue-500/50 text-gray-900'
                        : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/30 text-white'
                   )}
                   style={ theme === 'dark' ? { backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`} : {} }
                 >
                   <option value="ALBUM" className={theme === 'dark' ? 'bg-[#181818] text-white' : ''}>Album</option>
                   <option value="EP" className={theme === 'dark' ? 'bg-[#181818] text-white' : ''}>EP</option>
                 </select>
               </div>

               {/* Release Date & Time */}
               <div className="space-y-1.5">
                 <UILabel htmlFor="releaseDate" className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>Release Date & Time *</UILabel>
                 <Input
                   type="datetime-local"
                   id="releaseDate"
                   name="releaseDate"
                   value={albumData.releaseDate}
                   onChange={handleInputChange}
                   className={cn(
                     'w-full',
                     theme === 'light' ? 'bg-white border-gray-300' : 'bg-white/[0.07] border-white/[0.1]',
                     theme === 'dark' ? 'date-input-dark' : ''
                   )}
                   required
                   disabled
                 />
               </div>

               {/* Genres */}
               <div className="space-y-1.5">
                 <UILabel className={theme === 'dark' ? 'text-white/80' : 'text-gray-700'}>Genres *</UILabel>
                 <SearchableSelect
                   options={availableGenres}
                   value={selectedGenres}
                   onChange={setSelectedGenres}
                   placeholder="Select genres..."
                   multiple={true}
                   required={true}
                 />
               </div>

               {/* New Label Selector */}
               <div className="space-y-1.5">
                 <UILabel className={theme === 'dark' ? 'text-white/80' : 'text-gray-700'}>Label (Optional)</UILabel>
                 <SearchableSelect
                   options={availableLabels.map(l => ({ id: l.id, name: l.name }))}
                   value={selectedLabel ? [selectedLabel] : []}
                   onChange={(selectedIds: string[]) => {
                     setSelectedLabel(selectedIds.length > 0 ? selectedIds[0] : null);
                   }}
                   placeholder="Select a label..."
                   multiple={false}
                 />
               </div>

                {/* Submit Button */}
               <div className="flex justify-end pt-4">
                 <Button
                   type="submit"
                   disabled={isLoading || !albumData.title || !albumData.releaseDate || selectedGenres.length === 0}
                   className={cn(
                     'px-6 py-2.5',
                     theme === 'light'
                       ? 'bg-gray-900 text-white hover:bg-gray-800'
                       : 'bg-white text-[#121212] hover:bg-white/90',
                     'disabled:opacity-50 disabled:cursor-not-allowed'
                   )}
                 >
                   {isLoading ? 'Creating...' : 'Create Album'}
                 </Button>
               </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}