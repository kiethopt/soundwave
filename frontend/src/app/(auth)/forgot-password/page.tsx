'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function ForgotPasswordPage() {
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
    <div className="w-full max-w-[450px] p-10 bg-[#121212] rounded-lg mx-4">
      <h1 className="text-2xl font-bold text-white mb-8">Forgot Password</h1>
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
            htmlFor="email"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-white text-black py-2 rounded-full font-medium hover:bg-white/90"
        >
          Request Password Reset
        </button>
      </form>
      <p className="mt-6 text-center text-[#A7A7A7]">
        Remember your password?{' '}
        <Link href="/login" className="text-white hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
