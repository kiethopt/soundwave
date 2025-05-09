'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Album, Track, Genre, Label, ArtistProfile } from '@/types';
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
import { XIcon, Music, Upload, Edit, UserIcon, Tag } from 'lucide-react';
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
import { ArtistCreatableSelect } from '@/components/ui/ArtistCreatableSelect';
import { Textarea } from '@/components/ui/textarea';

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

interface SelectedArtist {
  id?: string;
  name: string;
}

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
  const [selectedFeaturedArtists, setSelectedFeaturedArtists] = useState<SelectedArtist[]>([]);
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
      setSelectedFeaturedArtists(
        track.featuredArtists?.map(fa => ({
          id: fa.artistProfile.id,
          name: fa.artistProfile.artistName
        })) || []
      );
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
      selectedFeaturedArtists.forEach(artist => {
        if (artist.id) {
          form.append('featuredArtistIds[]', artist.id);
        } else {
          form.append('featuredArtistNames[]', artist.name);
        }
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
                <ArtistCreatableSelect
                  existingArtists={availableArtists}
                  value={selectedFeaturedArtists}
                  onChange={setSelectedFeaturedArtists}
                  placeholder="Search or add featured artists..."
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

interface EditArtistProfileModalProps {
  artistProfile: ArtistProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (artistId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
  availableGenres?: Genre[] | Array<{ id: string; name: string }>;
}

export function EditArtistProfileModal({
  artistProfile,
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
  availableGenres = [],
}: EditArtistProfileModalProps) {
    const [artistName, setArtistName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [socialLinks, setSocialLinks] = useState<{ facebook?: string; instagram?: string; twitter?: string }>({});
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (artistProfile && isOpen) {
            setArtistName(artistProfile.artistName || '');
            setBio(artistProfile.bio || '');
            setAvatarPreview(artistProfile.avatar || null);
            setBannerPreview(artistProfile.artistBanner || null);
            setSocialLinks(artistProfile.socialMediaLinks || {});
      setSelectedGenres(artistProfile.genres?.map(g => g.genre.id) || []);
            setAvatarFile(null);
            setBannerFile(null);
            setIsSubmitting(false);
        } else {
            // Reset state when closing or no artist profile
            setArtistName('');
            setBio('');
            setAvatarPreview(null);
            setBannerPreview(null);
            setSocialLinks({});
            setSelectedGenres([]);
            setAvatarFile(null);
            setBannerFile(null);
            setIsSubmitting(false);
    }
  }, [artistProfile, isOpen]);

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        type: 'avatar' | 'banner'
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'avatar') {
                    setAvatarFile(file);
                    setAvatarPreview(reader.result as string);
                } else {
                    setBannerFile(file);
                    setBannerPreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSocialLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSocialLinks(prev => ({ ...prev, [name]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistProfile) return;

      setIsSubmitting(true);
        const formData = new FormData();

        // Append changed data
        if (artistName !== artistProfile.artistName) formData.append('artistName', artistName);
        if (bio !== (artistProfile.bio || '')) formData.append('bio', bio);
        if (avatarFile) formData.append('avatar', avatarFile);
        if (bannerFile) formData.append('artistBanner', bannerFile);

        // Append social links if changed (compare with initial state)
        const initialSocial = artistProfile.socialMediaLinks || {};
        if (JSON.stringify(socialLinks) !== JSON.stringify(initialSocial)) {
             // Filter out empty links before stringifying
            const filteredLinks = Object.entries(socialLinks)
                .filter(([key, value]) => key !== 'twitter' && value && value.trim() !== '') // Exclude twitter explicitly
                .reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {} as Record<string, string>);

            if (Object.keys(filteredLinks).length > 0) {
                 formData.append('socialMediaLinks', JSON.stringify(filteredLinks));
      } else {
                 // Send an empty object if all links are cleared
                 formData.append('socialMediaLinks', '{}');
            }
        }


        // Append genres if changed
        const initialGenreIds = artistProfile.genres?.map(g => g.genre.id) || [];
        if (JSON.stringify(selectedGenres.sort()) !== JSON.stringify(initialGenreIds.sort())) {
            // Send genres as a comma-separated string for easier backend parsing with FormData
             formData.append('genreIds', selectedGenres.join(','));
             console.log("Sending genreIds:", selectedGenres.join(','));
        }


        try {
            await onSubmit(artistProfile.id, formData);
      onClose();
    } catch (error) {
            console.error('Error updating artist profile:', error);
            // Error handled by parent component's onSubmit
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !artistProfile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
            "sm:max-w-3xl p-0 overflow-hidden flex flex-col", // Increased width
        theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-full",
                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
              )}>
                            <Edit className={cn( // Changed icon to Edit
                  "w-7 h-7",
                  theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                )} strokeWidth={1.5} />
              </div>
              <div>
                            <DialogTitle className={cn("text-lg font-bold", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                                Edit Artist Profile
                </DialogTitle>
                            <DialogDescription className={cn("text-sm mt-1", theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                                Update your artist details and associated genres.
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
                        )}>
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

            {/* Form */}
            <form onSubmit={handleSubmit} id="edit-artist-profile-form" className="px-6 pt-4 pb-6 overflow-y-auto flex-grow space-y-6">

                 {/* Banner Upload */}
                 <div className="space-y-2">
                     <UILabel htmlFor="banner-upload" className="text-sm font-medium">Artist Banner</UILabel>
                     <div
                className={cn(
                             "w-full h-40 rounded-md border border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden",
                             theme === "dark" ? "border-gray-600 hover:border-gray-500 bg-gray-800/50" : "border-gray-300 hover:border-gray-400 bg-gray-50"
                         )}
                         onClick={() => bannerInputRef.current?.click()}
                     >
                         {bannerPreview ? (
                             <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                         ) : (
                             <div className="text-center">
                                 <Image className={cn("mx-auto h-8 w-8", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                                 <p className={cn("mt-1 text-xs", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>Click to upload banner</p>
                             </div>
                         )}
                     </div>
                     <input
                         id="banner-upload"
                         ref={bannerInputRef}
                         type="file"
                         accept="image/*"
                         onChange={(e) => handleFileChange(e, 'banner')}
                         className="hidden"
                     />
                 </div>

                <div className="flex items-start gap-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                         <UILabel htmlFor="avatar-upload" className="text-sm font-medium">Avatar</UILabel>
                         <Avatar
                            className={cn(
                                "w-36 h-36 rounded-full border border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden", // Make it round
                                theme === "dark" ? "border-gray-600 hover:border-gray-500 bg-gray-800/50" : "border-gray-300 hover:border-gray-400 bg-gray-50"
                            )}
                            onClick={() => avatarInputRef.current?.click()}
                         >
                            <AvatarImage src={avatarPreview || undefined} alt="Avatar preview" className="w-full h-full object-cover" />
                            <AvatarFallback className="bg-transparent">
                                <div className="text-center">
                                    <UserIcon className={cn("mx-auto h-8 w-8", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                                    <p className={cn("mt-1 text-xs", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>Upload</p>
                                </div>
                            </AvatarFallback>
                         </Avatar>
                         <input
                            id="avatar-upload"
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'avatar')}
                            className="hidden"
                         />
                    </div>

                    {/* Name and Bio */}
                    <div className="flex-grow space-y-4">
                        <div className="space-y-2">
                            <UILabel htmlFor="artistName" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Artist Name</UILabel>
                            <Input
                                id="artistName"
                                value={artistName}
                                onChange={(e) => setArtistName(e.target.value)}
                                className={cn("w-full", theme === 'dark' ? 'bg-gray-700 border-gray-600' : '')}
                                placeholder="Enter artist name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <UILabel htmlFor="bio" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Biography</UILabel>
                            <Textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className={cn("w-full min-h-[100px]", theme === 'dark' ? 'bg-gray-700 border-gray-600' : '')}
                                placeholder="Tell us about yourself"
                            />
                        </div>
                    </div>
                 </div>

                 {/* Social Media Links */}
                 <div className="space-y-4">
                      <h3 className="text-md font-medium">Social Media Links</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <UILabel htmlFor="facebook" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Facebook URL</UILabel>
                             <Input
                                 id="facebook"
                                 name="facebook"
                                 value={socialLinks.facebook || ''}
                                 onChange={handleSocialLinkChange}
                                 className={cn("w-full", theme === 'dark' ? 'bg-gray-700 border-gray-600' : '')}
                                 placeholder="https://facebook.com/yourpage"
                             />
                         </div>
                         <div className="space-y-2">
                             <UILabel htmlFor="instagram" className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Instagram URL</UILabel>
                             <Input
                                 id="instagram"
                                 name="instagram"
                                 value={socialLinks.instagram || ''}
                                 onChange={handleSocialLinkChange}
                                 className={cn("w-full", theme === 'dark' ? 'bg-gray-700 border-gray-600' : '')}
                                 placeholder="https://instagram.com/yourprofile"
                             />
                         </div>
                      </div>
                 </div>

                {/* Genres */}
                <div className="space-y-2">
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
                        placeholder="Select your primary genres"
                  multiple={true}
                />
              <p className={cn(
                        "mt-1 text-sm",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}>
                        Select the genres that best represent your music style.
              </p>
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
                 disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
                 form="edit-artist-profile-form"
              className={cn(
                    "flex-1 text-center justify-center",
                theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700 text-white'
              )}
              disabled={isSubmitting}
            >
                 {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}

interface RegisterLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function RegisterLabelModal({
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: RegisterLabelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setName("");
      setDescription("");
      setLogoFile(null);
      setLogoPreview(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Label name is required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    if (description.trim()) {
      formData.append("description", description.trim());
    }
    if (logoFile) {
      formData.append("logoFile", logoFile);
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose(); // Close modal on successful submission
    } catch (error) {
      // Error is usually handled by the onSubmit prop, but a generic one can be here
      console.error("Error submitting label registration:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to register label."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "sm:max-w-lg p-0 overflow-hidden flex flex-col",
          theme === "dark"
            ? "bg-gray-800 text-white border-gray-700"
            : "bg-white text-gray-900"
        )}
      >
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-full",
                  theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
                )}
              >
                <Tag
                  className={cn(
                    "w-7 h-7",
                    theme === "dark" ? "text-purple-300" : "text-purple-600"
                  )}
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <DialogTitle
                  className={cn(
                    "text-lg font-bold",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}
                >
                  Register New Label
                </DialogTitle>
                <DialogDescription
                  className={cn(
                    "text-sm mt-1",
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  )}
                >
                  Provide details for your new record label.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              disabled={isSubmitting}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                theme === "dark"
                  ? "hover:bg-white/10"
                  : "hover:bg-black/5"
              )}
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          id="register-label-form"
          className="px-6 pt-4 pb-6 overflow-y-auto flex-grow"
        >
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-3">
              <UILabel
                htmlFor="logo-upload"
                className="self-start text-sm font-medium"
              >
                Label Logo (Optional)
              </UILabel>
              <Avatar
                className={cn(
                  "w-32 h-32 rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden group",
                  theme === "dark"
                    ? "border-gray-600 hover:border-gray-500 bg-gray-700/50"
                    : "border-gray-300 hover:border-gray-400 bg-gray-100"
                )}
                onClick={handleLogoClick}
              >
                <AvatarImage
                  src={logoPreview || undefined}
                  alt="Logo preview"
                  className="w-full h-full object-contain" // object-contain to show full logo
                />
                <AvatarFallback className="bg-transparent flex flex-col items-center justify-center">
                  <Upload
                    className={cn(
                      "mx-auto h-8 w-8 transition-opacity group-hover:opacity-70",
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    )}
                  />
                  <p
                    className={cn(
                      "mt-1 text-xs transition-opacity group-hover:opacity-70",
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    Upload Logo
                  </p>
                </AvatarFallback>
              </Avatar>
              <Input
                id="logo-upload"
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </div>

            {/* Label Name */}
            <div className="space-y-2">
              <UILabel
                htmlFor="labelName"
                className={
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }
              >
                Label Name <span className="text-red-500">*</span>
              </UILabel>
              <Input
                id="labelName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Indie Records"
                className={cn(
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 placeholder-gray-400"
                    : "bg-white"
                )}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <UILabel
                htmlFor="description"
                className={
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }
              >
                Description (Optional)
              </UILabel>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your label..."
                rows={4}
                className={cn(
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 placeholder-gray-400"
                    : "bg-white"
                )}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>

        {/* Footer with actions */}
        <div
          className={cn(
            "px-6 py-4 border-t",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                theme === "dark"
                  ? "border-gray-600 hover:bg-gray-700"
                  : "text-gray-700"
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="register-label-form" // Associate with the form
              disabled={isSubmitting || !name.trim()}
              className={cn(
                "bg-purple-600 hover:bg-purple-700 text-white",
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              {isSubmitting ? "Submitting..." : "Register Label"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}