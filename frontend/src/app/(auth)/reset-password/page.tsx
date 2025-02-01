'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

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
        // Hiển thị thông báo lỗi từ backend
        setError(err.message || 'An error occurred while resetting password');
      }
    },
    [newPassword, confirmPassword, token, router]
  );

  return (
    <div
      className="w-full max-w-[450px] p-10 bg-[#121212] rounded-lg mx-4"
      suppressHydrationWarning
    >
      <h1 className="text-2xl font-bold text-white mb-8">Reset Password</h1>
      {message && (
        <div className="bg-green-500/10 text-green-500 p-3 rounded-md mb-4">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 text-red-500 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            required
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-white text-black py-2 rounded-full font-medium hover:bg-white/90"
        >
          Reset Password
        </button>
      </form>
      <p className="mt-6 text-center text-[#A7A7A7]">
        Remember your password?{' '}
        <a href="/login" className="text-white hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
