import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import type { SortingState } from '@tanstack/react-table';

interface FetchDataResponse<T> {
  data: T[];
  pagination: { totalPages: number };
}

interface UseDataTableOptions<T> {
  fetchData: (
    page: number,
    params: URLSearchParams
  ) => Promise<FetchDataResponse<T>>;
  limit?: number;
  paramKeyPrefix?: string;
}

export function useDataTable<T>({
  fetchData,
  limit = 10,
  paramKeyPrefix = '',
}: UseDataTableOptions<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeGetParam = (key: string): string => {
    return searchParams?.get(key) || '';
  };

  const safeGetAllParams = (key: string): string[] => {
    return searchParams?.getAll(key) || [];
  };

  const safeParamsToString = (): string => {
    return searchParams?.toString() || '';
  };

  // Helper to get prefixed param key
  const getKey = (key: string) => `${paramKeyPrefix}${key}`;

  // Basic states
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Filter states - initialize from URL params using prefixed keys
  const [searchInput, setSearchInput] = useState(safeGetParam(getKey('q')));
  const [statusFilter, setStatusFilter] = useState<string[]>(
    safeGetAllParams(getKey('status'))
  );
  const [genreFilter, setGenreFilter] = useState<string[]>(
    safeGetAllParams(getKey('genres'))
  );
  const [verifiedFilter, setVerifiedFilter] = useState<string[]>(
    safeGetAllParams(getKey('isVerified'))
  );
  const [roleFilter, setRoleFilter] = useState<string[]>(safeGetAllParams(getKey('role')));
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sortBy = safeGetParam(getKey('sortBy'));
    const sortOrder = safeGetParam(getKey('sortOrder'));
    if (sortBy) {
      return [{ id: sortBy, desc: sortOrder === 'desc' }];
    }
    return [];
  });

  // Lấy currentPage từ URL, mặc định là 1
  const currentPage = Math.max(1, Number(safeGetParam(getKey('page'))) || 1);

  // Tham chiếu để theo dõi tải ban đầu và trạng thái trước đó để phát hiện thay đổi
  const initialLoad = useRef(true);
  const prevDeps = useRef({
    currentPage,
    searchInput,
    statusFilter,
    genreFilter,
    sorting,
    startDate: safeGetParam(getKey('startDate')), 
    endDate: safeGetParam(getKey('endDate')), 
    verifiedFilter: safeGetAllParams(getKey('isVerified')),
    roleFilter: safeGetAllParams(getKey('role')),
  });

  const fetchDataInternal = useCallback(
    async (
      pageToFetch: number,
      paramsToFetch: URLSearchParams,
      showLoading: boolean = true
    ) => {
      if (showLoading) {1
        setLoading(true);
      }
      try {
        const paramsForApi = new URLSearchParams();

        // 1. Đặt phân trang chuẩn từ pageToFetch và giới hạn
        paramsForApi.set('page', String(Math.max(1, pageToFetch)));
        paramsForApi.set('limit', String(limit));

        // 2. Đặt tham số tìm kiếm từ khóa URL có tiền tố trong paramsToFetch
        const currentSearchValue = paramsToFetch.get(getKey('q'));
        if (currentSearchValue) {
          paramsForApi.set('search', currentSearchValue); // Use 'search' for API
        }

        // 3. Đặt tham số bộ lọc từ các khóa URL có tiền tố trong paramsToFetch
        // Lọc theo status
        const currentStatusValues = paramsToFetch.getAll(getKey('status'));
        if (currentStatusValues.length > 0) {
          currentStatusValues.forEach((s) => paramsForApi.append('status', s));
        }
        // Lọc theo genres
        const currentGenreValues = paramsToFetch.getAll(getKey('genres'));
        if (currentGenreValues.length > 0) {
          currentGenreValues.forEach((g) => paramsForApi.append('genres', g));
        }
        // Lọc theo verified
        const currentVerifiedValues = paramsToFetch.getAll(getKey('isVerified'));
        if (currentVerifiedValues.length > 0) {
          currentVerifiedValues.forEach((v) => paramsForApi.append('isVerified', v));
        }
        // Lọc theo role
        const currentRoleValues = paramsToFetch.getAll(getKey('role'));
        if (currentRoleValues.length > 0) {
          currentRoleValues.forEach((r) => paramsForApi.append('role', r));
        }

        // 4. Đặt tham số sắp xếp từ các khóa URL có tiền tố trong paramsToFetch
        const currentSortBy = paramsToFetch.get(getKey('sortBy'));
        const currentSortOrder = paramsToFetch.get(getKey('sortOrder'));
        if (currentSortBy) {
          paramsForApi.set('sortBy', currentSortBy);
          if (currentSortOrder) {
            paramsForApi.set('sortOrder', currentSortOrder);
          }
        }

        // 5. Đặt tham số phạm vi ngày từ các khóa URL có tiền tố trong paramsToFetch
        const currentStartDate = paramsToFetch.get(getKey('startDate'));
        const currentEndDate = paramsToFetch.get(getKey('endDate'));
        if (currentStartDate) {
          paramsForApi.set('startDate', currentStartDate);
        }
        if (currentEndDate) {
          paramsForApi.set('endDate', currentEndDate);
        }
        const response = await fetchData(pageToFetch, paramsForApi);

        if (
          response &&
          Array.isArray(response.data) &&
          response.pagination &&
          typeof response.pagination.totalPages === 'number'
        ) {
          setData(response.data);
          setTotalPages(response.pagination.totalPages);
        } else {
          console.error(
            'Invalid data structure received from fetchData:',
            response
          );
          toast.error('Received invalid data structure from server.');
          setData([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Fetch data error:', error);
        toast.error((error as Error)?.message ?? 'Failed to fetch data');
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [fetchData, limit, getKey]
  );

  // Cập nhật URL params
  const updateUrlParams = useCallback(
    (
      updates: Record<string, string | number | string[] | null>,
      replace: boolean = false 
    ) => {
      const newParams = new URLSearchParams(safeParamsToString());
      let changed = false;

      Object.entries(updates).forEach(([key, value]) => {
        const prefixedKey = getKey(key);
        const currentValueInNew = newParams.getAll(prefixedKey);

        newParams.delete(prefixedKey);

        if (key === 'page' && (value === 1 || value === '1')) {
          if (currentValueInNew.length > 0) changed = true;
          return;
        }

        if (key === 'page') {
          value = Math.max(1, Number(value) || 1);
        }

        let valueChanged = false;

        if (Array.isArray(value)) {
          if (value.length > 0) {
            value.forEach((v) => newParams.append(prefixedKey, v.toString()));
            if (
              JSON.stringify(value.slice().sort()) !==
              JSON.stringify(currentValueInNew.slice().sort())
            ) {
              valueChanged = true;
            }
          } else {
            if (currentValueInNew.length > 0) {
              valueChanged = true;
            }
          }
        } else {
          if (value !== null && value !== '' && value !== undefined) {
            const stringValue = value.toString();
            newParams.set(prefixedKey, stringValue);
            if (
              currentValueInNew.length !== 1 ||
              currentValueInNew[0] !== stringValue
            ) {
              valueChanged = true;
            }
          } else {
            // Value is null/empty string/undefined, meaning remove the parameter
            if (currentValueInNew.length > 0) {
              valueChanged = true; // It changed if it existed before
            }
          }
        }
        if (valueChanged) {
          changed = true;
        }
      });

      // Only push/replace URL if changes occurred
      if (changed) {
        const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
        const targetUrl = pathname + queryStr;
        if (replace) {
          router.replace(targetUrl, { scroll: false });
        } else {
          router.push(targetUrl, { scroll: false });
        }
      }
    },
    // updateUrlParams phụ thuộc vào searchParams để đọc các params của các tab khác
    [router, searchParams, pathname, getKey, safeParamsToString]
  );

  // Effect 1: Lắng nghe State thay đổi -> Cập nhật URL (Tìm kiếm, Lọc, Sắp xếp)
  useEffect(() => {
    if (initialLoad.current) {
      return;
    }

    const updates: Record<string, any> = {};
    let stateChanged = false;
    let resetPage = false;

    // Kiểm tra từng state xem có thay đổi so với giá trị trước đó không (prevDeps.current)
    if (searchInput !== prevDeps.current.searchInput) {
      updates.q = searchInput === '' ? null : searchInput;
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(statusFilter) !==
      JSON.stringify(prevDeps.current.statusFilter)
    ) {
      updates.status = statusFilter.length > 0 ? statusFilter : null;
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(genreFilter) !==
      JSON.stringify(prevDeps.current.genreFilter)
    ) {
      updates.genres = genreFilter.length > 0 ? genreFilter : null;
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(verifiedFilter) !==
      JSON.stringify(prevDeps.current.verifiedFilter)
    ) {
      updates.isVerified = verifiedFilter.length > 0 ? verifiedFilter : null;
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(roleFilter) !==
      JSON.stringify(prevDeps.current.roleFilter)
    ) {
      updates.role = roleFilter.length > 0 ? roleFilter : null;
      stateChanged = true;
      resetPage = true;
    }
    if (JSON.stringify(sorting) !== JSON.stringify(prevDeps.current.sorting)) {
      if (sorting.length > 0) {
        updates.sortBy = sorting[0].id;
        updates.sortOrder = sorting[0].desc ? 'desc' : 'asc';
      } else {
        updates.sortBy = null; 
        updates.sortOrder = null;
      }
      stateChanged = true;
      resetPage = true;
    }

    // Nếu có thay đổi filter/search/sort -> reset page về 1
    if (resetPage) {
      updates.page = 1;
    }

    // Nếu state của hook này thay đổi (do người dùng tương tác)
    if (stateChanged) {
      // 1. Chỉ cập nhật URL
      updateUrlParams(updates, false);

      // 2.cCp nhật prevDeps để theo dõi state cho lần so sánh sau
      prevDeps.current = {
        ...prevDeps.current,
        searchInput,
        statusFilter,
        genreFilter,
        sorting,
        verifiedFilter,
        roleFilter,
      };
    }
  }, [
    searchInput,
    statusFilter,
    genreFilter,
    verifiedFilter,
    sorting,
    roleFilter,
    updateUrlParams,
    currentPage,
    getKey,
  ]);

  // Effect 2: Handle URL changes (trình duyệt back/forward, sửa URL trực tiếp, thay đổi trang)
  useEffect(() => {
    const urlPage = Math.max(1, Number(safeGetParam(getKey('page'))) || 1);
    const urlSearch = safeGetParam(getKey('q'));
    const urlStatus = safeGetAllParams(getKey('status'));
    const urlGenres = safeGetAllParams(getKey('genres'));
    const urlVerified = safeGetAllParams(getKey('isVerified'));
    const urlSortBy = safeGetParam(getKey('sortBy'));
    const urlSortOrder = safeGetParam(getKey('sortOrder'));
    const urlSorting = urlSortBy
      ? [{ id: urlSortBy, desc: urlSortOrder === 'desc' }]
      : [];
    const urlStartDate = safeGetParam(getKey('startDate')); // Read startDate from URL
    const urlEndDate = safeGetParam(getKey('endDate')); // Read endDate from URL

    // Check if URL state differs from *current tracked state (prevDeps)*
    const urlStateDiffers =
      urlPage !== prevDeps.current.currentPage ||
      urlSearch !== prevDeps.current.searchInput ||
      JSON.stringify(urlStatus) !==
        JSON.stringify(prevDeps.current.statusFilter) ||
      JSON.stringify(urlGenres) !==
        JSON.stringify(prevDeps.current.genreFilter) ||
      JSON.stringify(urlSorting) !== JSON.stringify(prevDeps.current.sorting) ||
      urlStartDate !== prevDeps.current.startDate || 
      urlEndDate !== prevDeps.current.endDate ||
      JSON.stringify(urlVerified) !== JSON.stringify(prevDeps.current.verifiedFilter) || // Compare verified filter
      JSON.stringify(safeGetAllParams(getKey('role'))) !== JSON.stringify(prevDeps.current.roleFilter); // Compare role filter


    // If initial load OR URL state has changed from tracked state
    if (initialLoad.current || urlStateDiffers) {
      // Sync state with URL values for this instance
      setSearchInput(urlSearch);
      setStatusFilter(urlStatus);
      setGenreFilter(urlGenres);
      setSorting(urlSorting);
      setVerifiedFilter(urlVerified);
      setRoleFilter(safeGetAllParams(getKey('role')));

      // Fetch data immediately based on URL state
      // Pass the current searchParams (representing the URL) to fetchDataInternal
      const paramsFromUrl = new URLSearchParams(safeParamsToString());
      fetchDataInternal(urlPage, paramsFromUrl, initialLoad.current); // Show loading only on initial load

      // Update previous dependencies ref *after* logic
      prevDeps.current = {
        currentPage: urlPage,
        searchInput: urlSearch,
        statusFilter: urlStatus,
        genreFilter: urlGenres,
        sorting: urlSorting,
        startDate: urlStartDate,
        endDate: urlEndDate,
        verifiedFilter: urlVerified,
        roleFilter: safeGetAllParams(getKey('role')),
      };

      if (initialLoad.current) {
        initialLoad.current = false;
      }
    }
  }, [searchParams, updateUrlParams, fetchDataInternal, getKey, safeParamsToString]);

  // Refresh data function (refetches based on current URL state)
  const refreshData = useCallback(async () => {
    const params = new URLSearchParams(safeParamsToString());
    const pageToRefresh = Math.max(1, Number(params.get(getKey('page'))) || 1);
    await fetchDataInternal(pageToRefresh, params);
  }, [searchParams, fetchDataInternal, getKey, safeParamsToString]);

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
    verifiedFilter,
    setVerifiedFilter,
    roleFilter,
    setRoleFilter,
    selectedRows,
    setSelectedRows,
    sorting,
    setSorting,
    updateQueryParam: updateUrlParams, 
    refreshData,
  };
}
