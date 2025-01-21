'use client';

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from "@/utils/api";

function LoadingUI() {
  return (
    <div>
      <h1>Loading...</h1>
    </div>
  );
}

function EditProfileContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // File object for the new avatar
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);

      // Preview the selected avatar
      const reader = new FileReader();
      reader.onload = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      const formDataObj = new FormData();
      formDataObj.append('email', email);
      formDataObj.append('username', username);
      formDataObj.append('name', name);
      formDataObj.append('password', password);
  
      // Append avatar file if selected
      if (avatarFile) {
        formDataObj.append('avatar', avatarFile);
      }

      // Send API request
      const response = await api.user.editProfile(token, formDataObj);
      console.log('Profile updated:', response);

      // Update local storage
      localStorage.setItem('userData', JSON.stringify(response));
      alert('Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile');
    }
  };
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setName(parsedUserData.name);
        setEmail(parsedUserData.email);
        setAvatar(parsedUserData.avatar || '');
        setUsername(parsedUserData.username);
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
            src={avatar || '/images/default-avatar.jpg'}
            alt="Avatar"
            width={200}
            height={200}
            className="rounded-full w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full text-white font-semibold cursor-pointer"
            onClick={() => document.getElementById('avatarInput')?.click()}
          >
            Change Avatar
          </div>
          <input
            id="avatarInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <form onSubmit={(e) => e.preventDefault()} className=" w-full flex-1 space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-white/70 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-white hover:bg-[#ffffffe6] text-black font-semibold rounded-md"
              onClick={handleSubmit}
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