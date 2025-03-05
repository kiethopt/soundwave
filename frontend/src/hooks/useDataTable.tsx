import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';

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
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Get current page from URL
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);

  // Ref to track initial load
  const initialLoad = useRef(true);

  // Update URL helper
  const updateQueryParam = useCallback(
    (param: string, value: number | string) => {
      const current = new URLSearchParams(searchParams.toString());
      if (value === 1 || value === '') {
        current.delete(param);
      } else {
        current.set(param, value.toString());
      }
      const queryStr = current.toString() ? `?${current.toString()}` : '';
      router.push(window.location.pathname + queryStr);
    },
    [router, searchParams]
  );

  // Debounce fetch data function
  const debouncedFetchData = useRef(
    debounce(async (page: number, params: URLSearchParams) => {
      try {
        setLoading(true);
        const response = await fetchData(page, params);
        setData(response.data);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        toast.error((error as Error)?.message ?? 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }, 500)
  ).current;

  // Fetch data function
  const fetchDataWithFilters = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());

      // Only update params that aren't already in the URL
      if (!params.has('page')) params.set('page', page.toString());
      if (!params.has('limit')) params.set('limit', limit.toString());

      // Apply other filters
      if (searchInput) params.set('q', searchInput);
      if (statusFilter.length === 1) params.set('status', statusFilter[0]);
      if (genreFilter.length > 0) {
        genreFilter.forEach((genre) => params.append('genres', genre));
      }

      debouncedFetchData(page, params);
    },
    [
      searchInput,
      statusFilter,
      genreFilter,
      limit,
      searchParams,
      debouncedFetchData,
    ]
  );

  // Handle filter and page changes
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      fetchDataWithFilters(currentPage);
      return;
    }
    fetchDataWithFilters(currentPage);
  }, [
    currentPage,
    searchInput,
    statusFilter,
    genreFilter,
    fetchDataWithFilters,
  ]);

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
