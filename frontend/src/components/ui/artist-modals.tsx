'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Album, Track, Genre, Label } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { XIcon, Music, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Image } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Edit Album Modal for Artists
interface EditAlbumModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (albumId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
  availableGenres?: Genre[] | Array<{ id: string; name: string }>;
  availableLabels?: Label[] | Array<{ id: string; name: string }>;
}

export function EditAlbumModal({
  album,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
  availableGenres = [],
  availableLabels = [],
}: EditAlbumModalProps) {
  const [formData, setFormData] = useState<Partial<Album>>({});
  const [isActive, setIsActive] = useState<boolean>(album?.isActive || false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [labelDisplayName, setLabelDisplayName] = useState<string>('No Label Assigned');

  useEffect(() => {
    if (album) {
      setFormData({
        title: album.title || '',
        releaseDate: album.releaseDate ? new Date(album.releaseDate).toISOString().split('T')[0] : '',
        type: album.type || 'ALBUM'
      });
      setIsActive(album.isActive);
      setSelectedGenres(album.genres?.map(g => g.genre.id) || []);
      setSelectedLabelId(album.labelId || null);
      setCoverPreview(album.coverUrl || null);
      setLabelDisplayName(album.label?.name || 'No Label Assigned');
    } else {
      resetForm();
    }
  }, [album, isOpen]);

  const resetForm = () => {
    setFormData({});
    setIsActive(false);
    setSelectedGenres([]);
    setSelectedLabelId(null);
    setCoverFile(null);
    setCoverPreview(null);
    setLabelDisplayName('No Label Assigned');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album) return;

    if (selectedGenres.length === 0) {
      toast.error('Please select at least one genre.');
      return; 
    }

    const form = new FormData();
    
    // Basic fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'releaseDate' && value) {
          try {
            form.append(key, new Date(value.toString()).toISOString());
          } catch (err) {
            console.error("Invalid date format for releaseDate");
            toast.error("Invalid release date format.");
            return;
          }
        } else {
          form.append(key, value.toString());
        }
      }
    });

    // Cover file
    if (coverFile) {
      form.append('coverFile', coverFile);
    }

    // Genres
    if (selectedGenres.length > 0) {
      selectedGenres.forEach(genreId => {
        form.append('genres[]', genreId);
      });
    }

    // Active status
    form.append('isActive', String(isActive));

    try {
      setIsUploading(true);
      await onSubmit(album.id, form);
      onClose();
    } catch (error) {
      console.error('Error updating album:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update album');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !album) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-lg p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
           <div className="flex items-center justify-between w-full">
             <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-full",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                <Music className={cn(
                    "w-7 h-7",
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                  )} strokeWidth={1.5} />
                </div>
                <div>
                  <DialogTitle className={cn(
                    "text-lg font-bold",
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}>
                    Edit Album
                  </DialogTitle>
                  <DialogDescription className={cn(
                    "text-sm mt-1",
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>
                  Update album information and settings
                  </DialogDescription>
                </div>
             </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                  theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
                )}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id="edit-album-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="space-y-4">
            {/* Cover Upload */}
            <div className="flex flex-col items-center gap-4">
              <UILabel htmlFor="cover-upload" className="self-start text-sm font-medium">
                Album Cover
              </UILabel>
              <Avatar
                className={cn(
                  "w-36 h-36 rounded-md border border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden",
                  theme === "dark" ? "border-gray-600 hover:border-gray-500 bg-gray-800/50" : "border-gray-300 hover:border-gray-400 bg-gray-50"
                )}
                onClick={handleCoverClick}
              >
                <AvatarImage src={coverPreview || undefined} alt="Cover preview" className="w-full h-full object-cover" />
                <AvatarFallback className="bg-transparent">
                  <div className="text-center">
                    <Image className={cn("mx-auto h-8 w-8", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                    <p className={cn("mt-1 text-xs", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>Click to upload</p>
                  </div>
                </AvatarFallback>
              </Avatar>
              <Input
                id="cover-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Main form fields in grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  {/* Title */}
              <div className="space-y-2 col-span-2">
                    <UILabel htmlFor="title" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Title
                    </UILabel>
                    <Input
                      id="title"
                  name="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={cn(
                        "w-full",
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      )}
                      placeholder="Enter album title"
                      required
                    />
                  </div>

              {/* Release Date */}
                    <div className="space-y-2">
                        <UILabel htmlFor="releaseDate" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          Release Date
                        </UILabel>
                        <Input
                          type="date"
                  id="releaseDate"
                  name="releaseDate"
                  value={formData.releaseDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                          className={cn(
                            "w-full",
                            theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                          )}
                          required
                        />
                    </div>

              {/* Type */}
                     <div className="space-y-2">
                      <UILabel htmlFor="type" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        Type
                      </UILabel>
                       <Select
                  value={formData.type || 'ALBUM'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as "ALBUM" | "EP" | "SINGLE" }))}
                       >
                        <SelectTrigger className={cn(
                            "w-full",
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                          )}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
                          <SelectItem value="ALBUM">Album</SelectItem>
                          <SelectItem value="EP">EP</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

              {/* Genres */}
              <div className="space-y-2 col-span-2">
                <UILabel className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  Genres
                      </UILabel>
                <SearchableSelect
                  options={availableGenres.map(genre => ({
                    id: genre.id,
                    name: genre.name
                  }))}
                  value={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Select genres"
                  multiple={true}
                />
                    </div>

              {/* Display Label (Read-only) */}
              <div className="space-y-2 col-span-2">
                <UILabel className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  Label 
                </UILabel>
                 <Input
                    id="labelDisplay"
                    value={labelDisplayName}
                    disabled
                    className={cn(
                      "w-full",
                      theme === 'dark'
                        ? 'bg-gray-700/50 border-gray-600 text-gray-300 cursor-not-allowed' 
                        : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    )}
                  />
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4 mt-2 col-span-2">
                      <div className="space-y-0.5">
                  <UILabel className="text-base">
                    Album Visibility
                        </UILabel>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isActive ? "Album is visible to users" : "Album is hidden from users"}
                        </p>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        aria-label="Toggle album visibility"
                      />
                    </div>
               </div>
        </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark'
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-100 bg-gray-50'
        )}>
           <Button
             type="button"
             variant="outline"
             onClick={onClose}
             className={cn(
               "flex-1 text-center justify-center",
               theme === 'dark'
                 ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                 : 'bg-white hover:bg-gray-50 border-gray-300'
             )}
            disabled={isUploading}
            >
            Cancel
          </Button>
           <Button
             type="submit"
             form="edit-album-form"
             className={cn(
               "flex-1 text-center justify-center",
               theme === 'dark'
                 ? 'bg-blue-600 hover:bg-blue-700'
                 : 'bg-neutral-900 hover:bg-neutral-900/90'
             )}
            disabled={isUploading || selectedGenres.length === 0}
           >
            {isUploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Track Modal for Artists
interface EditTrackModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trackId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
  availableGenres?: Genre[] | Array<{ id: string; name: string }>;
  availableLabels?: Label[] | Array<{ id: string; name: string }>;
  availableArtists?: { id: string; name: string }[];
}

export function EditTrackModal({
  track,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
  availableGenres = [],
  availableLabels = [],
  availableArtists = [],
}: EditTrackModalProps) {
  const [formData, setFormData] = useState<Partial<Track>>({});
  const [isActive, setIsActive] = useState<boolean>(track?.isActive || false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedFeaturedArtists, setSelectedFeaturedArtists] = useState<string[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [labelDisplayName, setLabelDisplayName] = useState<string>('No Label Assigned');

  useEffect(() => {
    if (track) {
      setFormData({
        title: track.title || '',
        releaseDate: track.releaseDate ? new Date(track.releaseDate).toISOString().split('T')[0] : '',
      });
      setIsActive(track.isActive);
      setSelectedGenres(track.genres?.map(g => g.genre.id) || []);
      setSelectedFeaturedArtists(track.featuredArtists?.map(fa => fa.artistProfile.id) || []);
      setSelectedLabelId(track.labelId || null);
      setCoverPreview(track.coverUrl || null);
      setLabelDisplayName(track.label?.name || 'No Label Assigned');
    } else {
      resetForm();
    }
  }, [track, isOpen]);

  const resetForm = () => {
    setFormData({});
    setIsActive(false);
    setSelectedGenres([]);
    setSelectedFeaturedArtists([]);
    setSelectedLabelId(null);
    setCoverFile(null);
    setCoverPreview(null);
    setLabelDisplayName('No Label Assigned');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!track) return;

    if (selectedGenres.length === 0) {
      toast.error('Please select at least one genre.');
      return; 
    }

    const form = new FormData();
    
    // Basic fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'releaseDate' && value) {
          try {
            form.append(key, new Date(value.toString()).toISOString());
          } catch (err) {
            console.error("Invalid date format for releaseDate");
            toast.error("Invalid release date format.");
            return;
          }
        } else {
          form.append(key, value.toString());
        }
      }
    });

    // Cover file
    if (coverFile) {
      form.append('coverFile', coverFile);
    }

    // Genres
    if (selectedGenres.length > 0) {
      selectedGenres.forEach(genreId => {
        form.append('genres[]', genreId);
      });
    }

    // Featured Artists
    if (selectedFeaturedArtists.length > 0) {
      selectedFeaturedArtists.forEach(artistId => {
        form.append('featuredArtists[]', artistId);
      });
    }

    // Active status
    form.append('isActive', String(isActive));

    try {
      setIsUploading(true);
      await onSubmit(track.id, form);
      onClose();
    } catch (error) {
      console.error('Error updating track:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update track');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !track) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-2xl p-0 overflow-hidden flex flex-col',
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <Music className={cn(
                  "w-7 h-7",
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-lg font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Edit Track
                </DialogTitle>
                <DialogDescription className={cn(
                  "text-sm mt-1",
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Update track information and settings
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id="edit-track-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow">
          <div className="space-y-4">
            {/* Cover Upload */}
            <div className="flex flex-col items-center gap-4">
              <UILabel htmlFor="cover-upload" className="self-start text-sm font-medium">Track Cover</UILabel>
              <Avatar
                className={cn(
                  "w-36 h-36 rounded-md border border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden",
                  theme === "dark" ? "border-gray-600 hover:border-gray-500 bg-gray-800/50" : "border-gray-300 hover:border-gray-400 bg-gray-50"
                )}
                onClick={handleCoverClick}>
                <AvatarImage src={coverPreview || undefined} alt="Cover preview" className="w-full h-full object-cover" />
                <AvatarFallback className="bg-transparent">
                  <div className="text-center">
                    <Image className={cn("mx-auto h-8 w-8", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                    <p className={cn("mt-1 text-xs", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>Click to upload</p>
                  </div>
                </AvatarFallback>
              </Avatar>
              <Input
                id="cover-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Main form fields in grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {/* Title */}
              <div className="space-y-2 col-span-2">
                <UILabel htmlFor="title" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Title</UILabel>
                <Input
                  id="title"
                  name="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={cn(
                    "w-full",
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  )}
                  placeholder="Enter track title"
                  required
                />
              </div>

              {/* Release Date and Track Type on the same row */}
              <div className="space-y-2 col-span-1">
                <UILabel htmlFor="releaseDate" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Release Date</UILabel>
                <Input
                  type="date"
                  id="releaseDate"
                  name="releaseDate"
                  value={formData.releaseDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                  className={cn("w-full", theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300')}
                  required
                />
              </div>
              <div className="space-y-2 col-span-1">
                <UILabel className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Track Type</UILabel>
                <div className={cn(
                  "px-3 py-2 rounded-md border h-9 flex items-center",
                  theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300 text-gray-500'
                )}>
                  {track.album ? track.album.type : 'SINGLE'}
                </div>
              </div>

              {/* Genres & Label on the same row */}
              <div className="space-y-2 col-span-1">
                <UILabel className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  Genres <span className="text-red-500">*</span>
                </UILabel>
                <SearchableSelect
                  options={availableGenres.map(genre => ({ id: genre.id, name: genre.name }))}
                  value={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Select genres"
                  multiple={true}
                  required={true}
                />
              </div>
              {/* Display Label (Read-only) */}
              <div className="space-y-2 col-span-1">
                <UILabel className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Label</UILabel>
                <Input
                  id="labelDisplay"
                  value={labelDisplayName}
                  disabled
                  className={cn(
                    "w-full",
                    theme === 'dark'
                      ? 'bg-gray-700/50 border-gray-600 text-gray-300 cursor-not-allowed' 
                      : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  )}
                />
              </div>

              {/* Featured Artists */}
              <div className="space-y-2 col-span-2">
                <UILabel className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Featured Artists</UILabel>
                <SearchableSelect
                  options={availableArtists.map(artist => ({ id: artist.id, name: artist.name }))}
                  value={selectedFeaturedArtists}
                  onChange={setSelectedFeaturedArtists}
                  placeholder="Select featured artists"
                  multiple={true}
                />
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4 mt-2 col-span-2">
                <div className="space-y-0.5">
                  <UILabel className="text-base">Track Visibility</UILabel>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isActive ? "Track is visible to users" : "Track is hidden from users"}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  aria-label="Toggle track visibility"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 flex gap-3 border-t flex-shrink-0",
          theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-300'
            )}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-track-form"
            className={cn(
              "flex-1 text-center justify-center",
              theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-900 hover:bg-neutral-900/90'
            )}
            disabled={isUploading || selectedGenres.length === 0}
          >
            {isUploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
