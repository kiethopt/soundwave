'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/Icons';
import { toast } from 'react-toastify';

export default function NewTrack({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [isLoading, setIsLoading] = useState(false);
  const [trackData, setTrackData] = useState({
    title: '',
    type: 'SINGLE',
    releaseDate: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

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
      } else if (e.target.name === 'cover') {
        setCoverFile(e.target.files[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', trackData.title);
      formData.append('type', 'SINGLE');
      formData.append('releaseDate', trackData.releaseDate);
      if (audioFile) formData.append('audioFile', audioFile);
      if (coverFile) formData.append('coverFile', coverFile);

      await api.tracks.create(formData, token);
      toast.success('Track created successfully');
      router.push('/artist/tracks');
    } catch (error) {
      console.error('Error creating track:', error);
      toast.error('Failed to create track');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto space-y-8" suppressHydrationWarning>
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/artist/tracks"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Tracks</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add New Track</h1>
      </div>
      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-white/60 mb-1"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={trackData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-white/60 mb-1"
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              value="SINGLE"
              disabled
              className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 cursor-not-allowed opacity-50"
            >
              <option value="SINGLE">Single</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="releaseDate"
              className="block text-sm font-medium text-white/60 mb-1"
            >
              Release Date
            </label>
            <input
              type="date"
              id="releaseDate"
              name="releaseDate"
              value={trackData.releaseDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>
          <div>
            <label
              htmlFor="audio"
              className="block text-sm font-medium text-white/60 mb-1"
            >
              Audio File
            </label>
            <input
              type="file"
              id="audio"
              name="audio"
              accept="audio/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>
          <div>
            <label
              htmlFor="cover"
              className="block text-sm font-medium text-white/60 mb-1"
            >
              Cover Image
            </label>
            <input
              type="file"
              id="cover"
              name="cover"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-white text-black rounded-md hover:bg-white/90 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
