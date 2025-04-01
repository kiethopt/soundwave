'use client';

import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/utils/api';

function SuccessMessage({ email }: { email: string }) {
  const [resent, setResent] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(true);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    try {
      await api.auth.requestPasswordReset(email);
      setResent(true);
      setShowSuccessMessage(false); // Hide the success message
      setCooldown(60); // Start cooldown for 60 seconds

      // Automatically hide the resent message after 5 seconds
      setTimeout(() => setResent(false), 3000);
    } catch (err: any) {
      console.error('Error resending verification code:', err.message);
    }
  };

  // Countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  return (
    <div className="text-left space-y-4 p-6 bg-[#121212] rounded-md">
      {showSuccessMessage && (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-lg font-bold text-green-500">
            Password recovery email sent successfully
          </p>
        </div>
      )}
      {resent && (
        <p className="text-lg font-bold border border-white text-white p-3">
          We have resent the verification code to {email}
        </p>
      )}
      <p className="text-sm text-white/60 font-bold">
        An account verification link was sent to {email}.
      </p>
      <p className="text-sm text-white/60 ">
        You can close this page and resume your account recovery from this link.
      </p>
      <p className="text-sm text-white/60 font-bold">
        Having trouble receiving an account verification code?
      </p>
      <p className="text-sm text-white/60">
        An account verification code is only sent if the destination is
        associated with a Steam account. <br />
        It could take up to 5 minutes to be delivered.
      </p>
      <button
        onClick={handleResend}
        disabled={cooldown > 0}
        className={`mt-4 py-2 px-4 rounded-md font-medium ${
          cooldown > 0
            ? 'bg-gray-500 text-white cursor-not-allowed'
            : 'bg-white text-black hover:bg-white/90'
        }`}
      >
        {cooldown > 0
          ? `Resend available in ${cooldown}s`
          : 'Resend account verification code'}
      </button>
    </div>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        const response = await api.auth.requestPasswordReset(email);

        if (response.message) {
          setMessage(response.message);
          setError('');
          setSuccess(true);
        } else {
          setError(response.message || 'An error occurred');
          setMessage('');
          setSuccess(false);
        }
      } catch (err: any) {
        setError(
          err.message || 'An error occurred while requesting password reset'
        );
        setSuccess(false);
      }
    },
    [email]
  );

  if (success) {
    return <SuccessMessage email={email} />;
  }

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
