'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';

interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await api.auth.register(formData);

      if (response.message) {
        router.push('/login');
      } else {
        setError(response.message || 'An error occurred');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  return (
    <div className="w-full max-w-[450px] p-10 bg-[#121212] rounded-lg mx-4">
      <h1 className="text-2xl font-bold text-white mb-8">
        Create Your Account
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
            htmlFor="username"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
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
            Full Name
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
          Sign up
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
