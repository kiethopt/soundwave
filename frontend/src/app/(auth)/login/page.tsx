'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { Music } from '@/components/ui/Icons';

interface LoginFormData {
  email: string;
  password: string;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const message = searchParams.get('message');
    if (message === 'account_deactivated') {
      setError('Your account has been deactivated. Please contact Admin.');
    }
  }, [searchParams]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        const response = await api.auth.login(formData);

        if (response.token && response.user) {
          // Lưu thông tin người dùng
          localStorage.setItem('userToken', response.token);
          localStorage.setItem('sessionId', response.sessionId);
          localStorage.setItem('userData', JSON.stringify(response.user));

          // Điều hướng bằng window.location để reload toàn bộ trang
          if (response.user.role === 'ADMIN') {
            window.location.href = '/admin/dashboard';
          } else if (response.user.artistProfile?.isVerified) {
            window.location.href = '/artist/dashboard';
          } else {
            window.location.href = '/';
          }
        } else {
          setError(response.message || 'An error occurred');
        }
      } catch (err: any) {
        console.error('Login error:', err);
        setError(err.message || 'An unexpected error occurred');
      }
    },
    [formData]
  );

  if (!mounted) {
    return null;
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Login to your account</h1>
        <p className="text-balance text-sm text-white/60">
          Enter your email below to login to your account
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
          <div className="flex items-center">
            <label
              htmlFor="password"
              className="text-sm font-medium text-white/70"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="ml-auto text-sm text-white/70 hover:text-white underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
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
          Login
        </button>
      </div>

      <div className="text-center text-sm text-white/70">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-white hover:underline underline-offset-4"
        >
          Sign up
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
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
            <Suspense fallback={<div>Loading...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-[#0a0a0a] lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#A57865]/30 via-black-500/20 to-pink-500/20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome to Soundwave
            </h2>
            <p className="text-white/70 max-w-md mx-auto">
              Discover, stream, and share a constantly expanding mix of music
              from emerging and major artists around the world.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
