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

  // Get current page and filters from URL
  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

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
        const message =
          error instanceof Error ? error.message : 'Failed to fetch data';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }, 500) // Delay 500ms
  ).current;

  // Fetch data function
  const fetchDataWithFilters = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (searchInput) params.set('q', searchInput);
      if (statusFilter.length === 1) params.set('status', statusFilter[0]);
      if (genreFilter.length > 0) {
        genreFilter.forEach((genre) => params.append('genres', genre));
      }
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      debouncedFetchData(page, params);
    },
    [
      searchInput,
      statusFilter,
      genreFilter,
      startDate,
      endDate,
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
    startDate,
    endDate,
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
