'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalTracks: 0,
    totalAlbums: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    // Kiểm tra role admin từ localStorage
    const userData = localStorage.getItem('userData');
    if (!userData || JSON.parse(userData).role !== 'ADMIN') {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/tracks"
          className="p-6 bg-white/5 rounded-lg hover:bg-white/10"
        >
          <h3 className="text-xl font-bold">Tracks</h3>
          <p className="text-white/60">Manage music tracks</p>
        </Link>

        <Link
          href="/admin/albums"
          className="p-6 bg-white/5 rounded-lg hover:bg-white/10"
        >
          <h3 className="text-xl font-bold">Albums</h3>
          <p className="text-white/60">Manage albums</p>
        </Link>

        <Link
          href="/admin/users"
          className="p-6 bg-white/5 rounded-lg hover:bg-white/10"
        >
          <h3 className="text-xl font-bold">Users</h3>
          <p className="text-white/60">Manage users</p>
        </Link>
      </div>
    </div>
  );
}
