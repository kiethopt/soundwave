"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Label } from "@/components/ui/label";
import { UserIcon } from "@/components/ui/Icons";

function LoadingUI() {
  return (
    <div>
      <h1>Loading...</h1>
    </div>
  );
}

function EditProfileContent() {
  const [avatar, setAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
  });

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
      const token = localStorage.getItem("userToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const formDataObj = new FormData();
      formDataObj.append("email", userData.email);
      formDataObj.append("username", userData.username);
      formDataObj.append("name", userData.name);
      formDataObj.append("password", userData.password);

      // Append avatar file if selected
      if (avatarFile) {
        formDataObj.append("avatar", avatarFile);
      }

      // Send API request
      const response = await api.user.editProfile(token, formDataObj);
      console.log("Profile updated:", response);

      // Update local storage
      localStorage.setItem("userData", JSON.stringify(response));
      alert("Profile updated successfully");
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("userToken");
      const storedUserData = JSON.parse(
        localStorage.getItem("userData") || "{}"
      );
      if (storedUserData) {
        setUserData({
          name: storedUserData.name,
          email: storedUserData.email,
          username: storedUserData.username,
          password: storedUserData.password,
        });
        setAvatar(storedUserData.avatar || "");
      }

      if (!token || !storedUserData) {
        router.push("/login");
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
            src={avatar || "/images/default-avatar.jpg"}
            alt="Avatar"
            width={200}
            height={200}
            className="rounded-full w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full text-white font-semibold cursor-pointer"
            onClick={() => document.getElementById("avatarInput")?.click()}
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

        <form
          onSubmit={(e) => e.preventDefault()}
          className=" w-full flex-1 space-y-6"
        >
          {/* Email (now first and read-only) */}
          <div className="space-y-3">
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Email
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white/50"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </span>
              <input
                type="email"
                id="email"
                name="email"
                value={userData.email || ""}
                className="w-full pl-10 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white cursor-not-allowed opacity-70"
                disabled
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-3">
            <Label
              htmlFor="username"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Username
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <UserIcon className="h-5 w-5 text-white/50" />
              </span>
              <input
                type="text"
                id="username"
                name="username"
                value={userData.username || ""}
                className="w-full pl-10 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white cursor-not-allowed opacity-70"
                required
                disabled
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-3">
            <Label
              htmlFor="name"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Display Name
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white/50"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <input
                type="text"
                id="name"
                name="name"
                value={userData.name || ""}
                onChange={(e) =>
                  setUserData({ ...userData, name: e.target.value })
                }
                className="w-full pl-10 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:ring-1 focus:ring-white/30 focus:border-white/30 transition duration-150"
                required
              />
            </div>
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
