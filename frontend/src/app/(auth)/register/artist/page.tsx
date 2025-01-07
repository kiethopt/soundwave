'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/utils/config';

interface ArtistFormData {
  email: string;
  password: string;
  name: string;
  bio: string;
  avatar?: File;
}

export default function RegisterArtistPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ArtistFormData>({
    email: '',
    password: '',
    name: '',
    bio: '',
  });
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('role', 'ARTIST');

      if (selectedFile) {
        formDataToSend.append('avatar', selectedFile);
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      router.push('/login');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    }
  };

  return (
    <div className="w-full max-w-[450px] p-10 bg-[#121212] rounded-lg mx-4">
      <h1 className="text-2xl font-bold text-white mb-8">
        Register as an Artist
      </h1>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            required
          />
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Artist Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            required
          />
        </div>

        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            rows={4}
          />
        </div>

        <div>
          <label
            htmlFor="avatar"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Profile Picture
          </label>
          <input
            type="file"
            id="avatar"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-white text-black py-2 rounded-full font-medium hover:bg-white/90"
        >
          Register as Artist
        </button>
      </form>

      <p className="mt-4 text-center text-white/70">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
