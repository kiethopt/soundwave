import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface UseDataTableOptions<T> {
  fetchData: (
    page: number,
    params: URLSearchParams
  ) => Promise<{
    data: T[];
    pagination: { totalPages: number };
  }>;
  limit?: number;
}

export function useDataTable<T>({
  fetchData,
  limit = 10,
}: UseDataTableOptions<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Basic states
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter states
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Get current page from URL
  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

  // Update URL helper
  const updateQueryParam = useCallback(
    (param: string, value: number) => {
      const current = new URLSearchParams(searchParams.toString());
      if (value === 1) {
        current.delete(param);
      } else {
        current.set(param, value.toString());
      }
      const queryStr = current.toString() ? `?${current.toString()}` : '';
      router.push(window.location.pathname + queryStr);
    },
    [router, searchParams]
  );

  // Fetch data function
  const fetchDataWithFilters = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', limit.toString());

        if (searchInput) params.append('q', searchInput);
        if (statusFilter.length === 1) params.append('status', statusFilter[0]);
        if (genreFilter.length > 0) {
          genreFilter.forEach((genre) => params.append('genres', genre));
        }

        const response = await fetchData(page, params);
        setData(response.data);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch data';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [fetchData, searchInput, statusFilter, genreFilter, limit]
  );

  // Handle filter changes
  useEffect(() => {
    if (currentPage === 1) {
      fetchDataWithFilters(1);
    } else {
      updateQueryParam('page', 1);
    }
  }, [searchInput, statusFilter, genreFilter]);

  // Handle page changes
  useEffect(() => {
    fetchDataWithFilters(currentPage);
  }, [currentPage]);

  return {
    data,
    setData,
    loading,
    totalPages,
    currentPage,
    actionLoading,
    setActionLoading,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    genreFilter,
    setGenreFilter,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
  };
}
