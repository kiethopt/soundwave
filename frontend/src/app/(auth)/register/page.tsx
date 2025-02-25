'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { Music } from '@/components/ui/Icons';

interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  name: string;
}

function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState<string>('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        const response = await api.auth.register(formData);

        if (response.message) {
          router.push('/login');
        } else {
          setError(response.message || 'An error occurred');
        }
      } catch (err: any) {
        // Hiển thị thông báo lỗi từ backend
        setError(err.message || 'An unexpected error occurred');
      }
    },
    [formData, router]
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
        <p className="text-balance text-sm text-white/60">
          Sign up to start listening to music
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-3 rounded-md">{error}</div>
      )}

      <div className="grid gap-6">
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium text-white/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="username"
            className="text-sm font-medium text-white/70"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
          />
          <p className="text-xs text-white/50">
            Username cannot contain spaces or special characters.
          </p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium text-white/70">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-white/70"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-white text-black py-2 rounded-md font-medium hover:bg-white/90"
        >
          Sign up
        </button>
      </div>

      <div className="text-center text-sm text-white/70">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-white hover:underline underline-offset-4"
        >
          Log in
        </Link>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-[#121212]">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            href="/"
            className="flex items-center gap-2 font-medium text-white"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-black">
              <Music className="size-4" />
            </div>
            Soundwave
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-[#0a0a0a] lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#A57865]/30 via-black-500/20 to-pink-500/20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Join Soundwave Today
            </h2>
            <p className="text-white/70 max-w-md mx-auto">
              Create an account to enjoy unlimited access to millions of songs
              and albums. No credit card needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
