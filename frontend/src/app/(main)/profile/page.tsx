'use client';

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';

function LoadingUI() {
  return (
    <div>
      <h1>Loading...</h1>
    </div>
  );
}

interface UserData {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
}

function EditProfileContent() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    name: '',
    avatar: '',
  });
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log('Form Data:', formData);
    },
    [formData]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setFormData({
          email: parsedUserData?.email || '',
          username: parsedUserData?.username || '',
          password: '',
          name: parsedUserData?.name || '',
          avatar: parsedUserData?.avatar || '',
        });
      }

      if (!token || !storedUserData) {
        router.push('/login');
      }
    }
  }, [router]);

  return (
    <div className="container flex flex-col p-6 gap-8 justify-center mx-auto">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Edit Profile
      </h1>

      <div className="flex flex-col lg:flex-row justify-center lg:justify-between max-w-screen-lg gap-8 lg:gap-24">
        {/* Avatar */}
        <div className="relative w-[200px] h-[200px] flex mx-auto justify-center group mt-4">
          <Image
            src={userData?.avatar || '/images/default-avatar.jpg'} 
            alt="Avatar"
            width={200}
            height={200}
            className="rounded-full w-full h-full object-cover"
          />
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full text-white font-semibold cursor-pointer"
            onClick={() => alert('Change Avatar')}>
              Change Avatar
          </div>
        </div>

        <form onSubmit={handleSubmit} className=" w-full flex-1 space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-white/70 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData?.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData?.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
              required
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData?.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-white hover:bg-[#ffffffe6] text-black font-semibold rounded-md hover:bg-blue-700"
              onClick={() => handleSubmit}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<LoadingUI />}>      
      <EditProfileContent />
    </Suspense>
  );
}