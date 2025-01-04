import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('userToken');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    setLoading(false);
  }, [router]);

  return { token, loading };
};
