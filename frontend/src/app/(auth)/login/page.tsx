'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/utils/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { FcGoogle } from 'react-icons/fc';

interface LoginFormData {
  emailOrUsername: string;
  password: string;
  rememberMe: boolean;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({
    emailOrUsername: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    const message = searchParams ? searchParams.get('message') : null;
    if (message === 'account_deactivated') {
      setError('Your account has been deactivated. Please contact Admin.');
    }

    const rememberedLogin = localStorage.getItem('rememberedLogin');
    if (rememberedLogin) {
      setFormData(JSON.parse(rememberedLogin));
    }
  }, [searchParams]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        const response = await api.auth.login(formData);

        if (response.token && response.user) {
          // Lưu token và thông tin user
          localStorage.setItem('userToken', response.token);
          localStorage.setItem('sessionId', response.sessionId);
          localStorage.setItem('userData', JSON.stringify(response.user));

          // Nếu Remember Me được chọn, lưu thông tin đăng nhập
          if (formData.rememberMe) {
            localStorage.setItem('rememberedLogin', JSON.stringify(formData));
          } else {
            localStorage.removeItem('rememberedLogin');
          }

          // Điều hướng đến trang tương ứng
          if (response.user.role === 'ADMIN') {
            window.location.href = '/admin/dashboard';
          } else if (response.user.currentProfile === 'ARTIST' && response.user.artistProfile?.isVerified) {
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!mounted) {
    return null;
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit}
      suppressHydrationWarning
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Login to your account</h1>
        <p className="text-balance text-sm text-white/60">
          Enter your email or username below to login to your account
        </p>
      </div>
        {error && (
          <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
      <div className="grid gap-6">
        <div className="grid gap-2">
          <label
            htmlFor="emailOrUsername"
            className="text-sm font-medium text-white/70"
          >
            Email or Username
          </label>
          <input
            id="emailOrUsername"
            type="text"
            placeholder="email@example.com or username"
            required
            value={formData.emailOrUsername}
            onChange={(e) =>
              setFormData({ ...formData, emailOrUsername: e.target.value })
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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white pr-10"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            checked={formData.rememberMe}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, rememberMe: checked === true })
            }
            className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
          />
          <label
            htmlFor="rememberMe"
            className="text-sm font-medium text-white/70 cursor-pointer"
          >
            Remember me
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-white text-black py-2 rounded-md font-medium hover:bg-white/90"
        >
          Login
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#121212] px-2 text-white/70">OR</span>
          </div>
        </div>

        <GoogleLoginButton onError={setError} />
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

interface GoogleLoginButtonProps {
  onError: (error: string) => void;
}

function GoogleLoginButton({ onError }: GoogleLoginButtonProps) {
  const router = useRouter();
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const backendResponse = await api.auth.googleLogin({
          token: tokenResponse.access_token,
        });
        console.log('Backend response:', backendResponse);

        if (backendResponse.token && backendResponse.user) {
          // Lưu token và thông tin user
          localStorage.setItem('userToken', backendResponse.token);
          localStorage.setItem('userData', JSON.stringify(backendResponse.user));

          // Điều hướng đến trang tương ứng
          if (backendResponse.user.role === 'ADMIN') {
            window.location.href = '/admin/dashboard';
          } else if (backendResponse.user.currentProfile === 'ARTIST' && backendResponse.user.artistProfile?.isVerified) {
            window.location.href = '/artist/dashboard';
          } else {
            window.location.href = '/';
          }
        }
      } catch (error: any) {
        console.error('Error sending token to backend:', error);
        onError(error.message || 'An unexpected error occurred');
      }
    },
    onError: () => {
      onError('Google login failed. Please try again.');
    },
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      className="w-full bg-white text-black py-2 rounded-md font-medium hover:bg-white/90 flex items-center justify-center gap-2"
    >
      <FcGoogle className="w-5 h-5" />
      <span>Continue with Google</span>
    </button>
  );
}

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
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
    </GoogleOAuthProvider>
  );
}
