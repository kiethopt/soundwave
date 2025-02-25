'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { Music } from '@/components/ui/Icons';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        const response = await api.auth.requestPasswordReset(email);

        if (response.message) {
          setMessage(response.message);
          setError('');
        } else {
          setError(response.message || 'An error occurred');
          setMessage('');
        }
      } catch (err: any) {
        // Hiển thị thông báo lỗi từ backend
        setError(
          err.message || 'An error occurred while requesting password reset'
        );
      }
    },
    [email]
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
        <p className="text-balance text-sm text-white/60">
          Enter your email and we'll send you a link to reset your password
        </p>
      </div>

      {message && (
        <div className="bg-green-500/10 text-green-500 p-3 rounded-md">
          {message}
        </div>
      )}

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-white text-black py-2 rounded-md font-medium hover:bg-white/90"
        >
          Request Password Reset
        </button>
      </div>

      <div className="text-center text-sm text-white/70">
        Remember your password?{' '}
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

export default function ForgotPasswordPage() {
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
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-[#0a0a0a] lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#A57865]/30 via-black-500/20 to-pink-500/20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Reset Your Password
            </h2>
            <p className="text-white/70 max-w-md mx-auto">
              We'll send you instructions to reset your password and get you
              back to enjoying your music.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
