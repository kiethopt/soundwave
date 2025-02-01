'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';

interface LoginFormData {
  email: string;
  password: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
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
          localStorage.setItem('userToken', response.token);
          localStorage.setItem('sessionId', response.sessionId);
          localStorage.setItem('userData', JSON.stringify(response.user));

          if (response.user.role === 'ADMIN') {
            // Chuyển hướng đến dashboard của Admin
            router.push('/admin/dashboard');
          } else if (response.user.role === 'ARTIST') {
            // Chuyển hướng đến dashboard của Artist
            router.push('/artist/dashboard');
          } else {
            router.push('/');
          }
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
    <div className="w-full max-w-[450px] p-10 bg-[#121212] rounded-lg mx-4">
      <h1 className="text-2xl font-bold text-white mb-8">
        Login to Your Account
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
          Log in
        </button>
      </form>
      <p className="mt-6 text-center text-[#A7A7A7]">
        {`Don't have an account?`}{' '}
        <Link href="/register" className="text-white hover:underline">
          Sign up
        </Link>
      </p>
      <p className="mt-4 text-center text-[#A7A7A7]">
        Forgot your password?{' '}
        <Link href="/forgot-password" className="text-white hover:underline">
          Reset it here
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
