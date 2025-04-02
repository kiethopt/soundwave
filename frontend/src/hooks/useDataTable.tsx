import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import type { SortingState } from '@tanstack/react-table';

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
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Filter states
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string[]>(
    searchParams.getAll('status') || []
  );
  const [genreFilter, setGenreFilter] = useState<string[]>(
    searchParams.getAll('genres') || []
  );
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');
    if (sortBy) {
      return [{ id: sortBy, desc: sortOrder === 'desc' }];
    }
    return [];
  });

  // --- Correctly calculate currentPage based on URL, ensuring it's >= 1 ---
  const currentPageFromUrl = Number(searchParams.get('page')) || 1;
  const currentPage = Math.max(1, currentPageFromUrl);

  // Ref to track initial load & previous state for change detection
  const initialLoad = useRef(true);
  const prevDeps = useRef({ currentPage, statusFilter, genreFilter, sorting });

  // --- Fetching Logic ---

  // Immediate fetch function
  const fetchDataNow = useCallback(
    async (
      page: number,
      params: URLSearchParams,
      showLoading: boolean = true
    ) => {
      const validPage = Math.max(1, page);
      if (!params.has('limit')) {
        params.set('limit', limit.toString());
      }
      params.set('page', validPage.toString());

      try {
        if (showLoading) {
          setLoading(true);
        }
        const response = await fetchData(validPage, params);
        setData(response.data);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        toast.error((error as Error)?.message ?? 'Failed to fetch data');
      } finally {
        // Always set loading to false, even if it wasn't set to true initially
        setLoading(false);
      }
    },
    [fetchData, limit]
  );

  // Debounced fetch specifically for search input
  const debouncedSearchFetch = useRef(
    debounce((page: number, params: URLSearchParams) => {
      fetchDataNow(page, params); // Defaults to showLoading: true
    }, 500)
  ).current;

  // --- URL Update Logic ---

  const updateQueryParams = useCallback(
    (updates: Record<string, string | number | string[] | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      let changed = false;

      Object.entries(updates).forEach(([param, value]) => {
        if (param === 'page') {
          value = Math.max(1, Number(value) || 1);
        }

        const currentValue = current.getAll(param);

        if (Array.isArray(value)) {
          if (value.length === 0 && currentValue.length > 0) {
            current.delete(param);
            changed = true;
          } else if (value.length > 0) {
            if (
              JSON.stringify(value.sort()) !==
              JSON.stringify(currentValue.sort())
            ) {
              current.delete(param);
              value.forEach((v) => current.append(param, v.toString()));
              changed = true;
            }
          }
        } else {
          const stringValue = value?.toString();
          const currentSingleValue = current.get(param);

          if ((value === null || value === '') && currentSingleValue !== null) {
            current.delete(param);
            changed = true;
          } else if (
            value !== null &&
            value !== '' &&
            stringValue !== currentSingleValue
          ) {
            current.set(param, stringValue!);
            changed = true;
          }
        }
      });

      if (changed) {
        const queryStr = current.toString() ? `?${current.toString()}` : '';
        // Use replace instead of push for non-user-initiated updates to avoid messy history
        router.replace(window.location.pathname + queryStr, { scroll: false });
      }
    },
    [router, searchParams] // Keep searchParams here as update logic *reads* it
  );

  // --- Effects for State Changes ---

  // Effect for Search Input Changes -> Update URL & Debounced Fetch
  useEffect(() => {
    // Don't run on initial load if search is already matching URL
    if (initialLoad.current && searchInput === (searchParams.get('q') || '')) {
      // But mark initial load as done for the *other* effect
      // initialLoad.current = false; // Let the other effect handle initial load fetch
      return;
    }

    updateQueryParams({ q: searchInput, page: 1 });

    const params = new URLSearchParams();
    params.set('page', '1');
    if (searchInput) params.set('search', searchInput);
    // Include current filters/sorting when search triggers a fetch
    if (statusFilter.length === 1) params.set('status', statusFilter[0]);
    genreFilter.forEach((genre) => params.append('genres', genre));
    if (sorting.length > 0) {
      const sort = sorting[0];
      params.set('sortBy', sort.id);
      params.set('sortOrder', sort.desc ? 'desc' : 'asc');
    }

    debouncedSearchFetch(1, params);
  }, [searchInput]);

  // Effect for Page changes (from URL), Filters -> Update URL & Immediate Fetch
  // IMPORTANT: This effect should NOT depend on `sorting` or `searchInput`
  useEffect(() => {
    const currentSearchParams = new URLSearchParams(searchParams.toString()); // Read current params inside
    // Determine if state relevant to this effect has actually changed since last run
    const currentState = { currentPage, statusFilter, genreFilter }; // Exclude sorting
    const hasChanged =
      JSON.stringify(currentState) !==
      JSON.stringify({
        currentPage: prevDeps.current.currentPage,
        statusFilter: prevDeps.current.statusFilter,
        genreFilter: prevDeps.current.genreFilter,
      });

    // Prepare params based on *current* state for potential fetch
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('limit', limit.toString());
    if (searchInput) params.set('search', searchInput); // Include current search
    if (statusFilter.length > 0)
      statusFilter.forEach((s) => params.append('status', s));
    if (genreFilter.length > 0)
      genreFilter.forEach((g) => params.append('genres', g));
    // Include current sorting state (from state, not prevDeps) in the fetch params
    if (sorting.length > 0) {
      const sort = sorting[0];
      params.set('sortBy', sort.id);
      params.set('sortOrder', sort.desc ? 'desc' : 'asc');
    }

    // --- Update URL --- Sync URL ONLY with page/filters/search
    let pageToSync = currentPage;
    // Reset page in URL update if filters changed significantly
    if (
      JSON.stringify(statusFilter) !==
        JSON.stringify(prevDeps.current.statusFilter) ||
      JSON.stringify(genreFilter) !==
        JSON.stringify(prevDeps.current.genreFilter)
    ) {
      pageToSync = 1; // Reset page to 1 in the URL if filters change
      params.set('page', '1'); // Also update fetch params page
    }

    updateQueryParams({
      page: pageToSync,
      status: statusFilter,
      genres: genreFilter,
      q: searchInput || null,
      // DO NOT sync sortBy/sortOrder in URL updates from this effect
    });

    // --- Trigger Fetch --- Only if it's the initial load or relevant state actually changed
    if (initialLoad.current || hasChanged) {
      fetchDataNow(pageToSync, params); // Use potentially reset page for fetch
    }

    // Update refs for next render AFTER fetch/update logic
    // Keep the existing sorting state in prevDeps when updating from this effect
    prevDeps.current = { ...currentState, sorting: prevDeps.current.sorting };
    if (initialLoad.current) initialLoad.current = false;

    // Dependencies EXCLUDE sorting and searchInput
  }, [
    currentPage,
    statusFilter,
    genreFilter,
    limit,
    // searchInput is implicitly included via params build but not a dependency
    // sorting is implicitly included via params build but not a dependency
    fetchDataNow,
    updateQueryParams,
  ]);

  // New Effect specifically for Sorting Changes -> Immediate Fetch (NO URL update)
  useEffect(() => {
    // Skip initial load fetch if the main effect already handled it
    if (initialLoad.current) {
      return;
    }

    // Check if sorting actually changed compared to previous committed state
    if (JSON.stringify(sorting) === JSON.stringify(prevDeps.current.sorting)) {
      return; // Sorting hasn't changed, do nothing
    }

    console.log('Sorting changed, fetching data...'); // Debug log

    // Prepare params with the new sorting state
    const params = new URLSearchParams();
    const currentUrlPage = Math.max(1, Number(searchParams.get('page')) || 1);
    params.set('page', currentUrlPage.toString());
    params.set('limit', limit.toString());
    if (searchInput) params.set('search', searchInput);
    if (statusFilter.length > 0)
      statusFilter.forEach((s) => params.append('status', s));
    if (genreFilter.length > 0)
      genreFilter.forEach((g) => params.append('genres', g));

    // Apply the NEW sorting state
    if (sorting.length > 0) {
      const sort = sorting[0];
      params.set('sortBy', sort.id);
      params.set('sortOrder', sort.desc ? 'desc' : 'asc');
    }

    // Trigger immediate fetch with new sorting, NO URL update
    fetchDataNow(currentUrlPage, params, false);

    // Update the sorting part of prevDeps *after* the fetch is triggered
    prevDeps.current = { ...prevDeps.current, sorting };
  }, [
    sorting,
    limit,
    searchInput,
    statusFilter,
    genreFilter,
    fetchDataNow,
    searchParams,
  ]); // Depend on sorting and other params needed for fetch

  // Refresh data function
  const refreshData = useCallback(async () => {
    const params = new URLSearchParams(searchParams.toString());
    const pageToRefresh = Math.max(1, Number(params.get('page')) || 1);
    // Ensure params reflect current state accurately for the refresh
    params.set('page', pageToRefresh.toString());
    if (searchInput) params.set('search', searchInput);
    else params.delete('search');
    params.delete('status');
    if (statusFilter.length > 0)
      statusFilter.forEach((s) => params.append('status', s));
    params.delete('genres');
    if (genreFilter.length > 0)
      genreFilter.forEach((g) => params.append('genres', g));
    params.delete('sortBy');
    params.delete('sortOrder');
    if (sorting.length > 0) {
      const sort = sorting[0];
      params.set('sortBy', sort.id);
      params.set('sortOrder', sort.desc ? 'desc' : 'asc');
    }
    if (!params.has('limit')) params.set('limit', limit.toString());

    await fetchDataNow(pageToRefresh, params);
  }, [
    fetchDataNow,
    searchInput,
    statusFilter,
    genreFilter,
    sorting,
    searchParams,
    limit,
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
    sorting,
    setSorting,
    updateQueryParam: updateQueryParams,
    refreshData,
  };
}
