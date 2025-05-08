"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { User } from "@/types";
import Image from "next/image";
import Link from "next/link"

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

export default function UserFollowersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [follower, setFollower] = useState<User[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("userToken");
    if (!storedToken) {
      router.push("/login");
      return;
    }

    const fetchFollowerData = async () => {
      try {
        const followersResponse = await api.user.getUserFollowers(
          id,
          storedToken
        );

        if (followersResponse && followersResponse.followers) {
          const followers = followersResponse.followers;

          setFollower(followers);
        }
      } catch (error) {
        console.error("Failed to fetch follower data:", error);
      }
    };

    fetchFollowerData();
  }, [id, router]);

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Followers</h1>

        {/* Grid for content */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
          {/* Render Users if filter is 'all' or 'users' */}
          {follower.map((user) => (
            <div
              key={user.id}
              className="hover:bg-white/5 p-3 rounded-lg group relative cursor-pointer flex flex-col items-center flex-shrink-0 w-[180px]"
              onClick={() => router.push(`/profile/${user.id}`)}
            >
              <div className="w-full mb-4">
                <Link href={`/profile/${user.id}`}>
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4 flex-shrink-0">
                    <Image
                      src={user.avatar || DEFAULT_AVATAR}
                      alt={user.name || user.username || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>
              </div>
              <div className="w-full text-left mt-1">
                <h3 className="font-medium truncate text-white w-full">
                  {user.name || user.username}
                </h3>
                <p className="text-sm text-white/60">Profile</p>
              </div>
            </div>
          ))}
        </div>

        {/* Optional: Message for empty results */}
        {follower.length === 0 && (
          <p className="text-start text-gray-500">No followers found.</p>
        )}
      </div>
    </div>
  );
}
