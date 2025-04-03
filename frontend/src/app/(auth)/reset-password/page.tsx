'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/utils/api';
import { Eye, EyeOff } from '@/components/ui/Icons';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams ? searchParams.get('token') : null;

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!token) {
        setError('Invalid token');
        return;
      }

      try {
        const data = await api.auth.resetPassword({ token, newPassword });

        if (data.message) {
          setMessage(data.message);
          setError('');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          setError(data.message || 'An error occurred');
          setMessage('');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while resetting password');
      }
    },
    [newPassword, confirmPassword, token, router]
  );

  const passwordMatch = newPassword === confirmPassword;

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="text-balance text-sm text-white/60">
          Enter your new password below
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
          <label
            htmlFor="newPassword"
            className="text-sm font-medium text-white/70"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white pr-10"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-white/70"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white pr-10"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>

          {newPassword && confirmPassword && (
            <p
              className={`text-sm ${
                passwordMatch ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {passwordMatch
                ? '✅ Passwords match'
                : '❌ Passwords do not match'}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-white text-black py-2 rounded-md font-medium hover:bg-white/90"
        >
          Reset Password
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

export default function ResetPassword() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-[#121212]">
        <div className="flex justify-center md:justify-start">
          <a href="/" className="inline-block">
            <Image
              src="/images/Soundwave_full.webp"
              alt="Soundwave Logo"
              width={140}
              height={40}
              className="object-contain"
            />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Suspense fallback={<div>Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-[#0a0a0a] lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#A57865]/30 via-black-500/20 to-pink-500/20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Create a New Password
            </h2>
            <p className="text-white/70 max-w-md mx-auto">
              Choose a strong password to keep your account secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
