'use client';

import { useEffect, useState } from 'react';
import type { Genre } from '@/types';
import { api } from '@/utils/api';
import { toast } from 'react-toastify';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { DataTableWrapper } from '@/components/data-table/data-table-wrapper';
import { getGenreColumns } from '@/components/data-table/data-table-columns';
import { useDataTable } from '@/hooks/useDataTable';
import {
  AddGenreModal,
  EditGenreModal,
} from '@/components/data-table/data-table-modals';

export default function GenreManagement() {
  const { theme } = useTheme();
  const limit = 10;

  // Sử dụng custom hook useDataTable
  const {
    data: genres,
    setData: setGenres,
    loading,
    totalPages,
    currentPage,
    setActionLoading,
    searchInput,
    setSearchInput,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
  } = useDataTable<Genre>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.genres.getAll(token, page, limit);
      return {
        data: response.genres,
        pagination: response.pagination,
      };
    },
    limit,
  });

  // Table state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);

  // Action handlers
  const handleAddGenre = async (name: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.createGenre({ name }, token);

      // Refresh trang hiện tại
      const params = new URLSearchParams();
      if (searchInput) params.append('q', searchInput);
      const response = await api.genres.getAll(token, currentPage, limit);
      setGenres(response.genres);

      toast.success('Genre created successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create genre'
      );
    }
  };

  // Xử lý sự kiện mở modal từ button trong column
  useEffect(() => {
    const handleOpenModal = () => setIsAddModalOpen(true);
    window.addEventListener('openAddGenreModal', handleOpenModal);
    return () =>
      window.removeEventListener('openAddGenreModal', handleOpenModal);
  }, []);

  const handleDeleteGenres = async (genreIds: string | string[]) => {
    const ids = Array.isArray(genreIds) ? genreIds : [genreIds];
    if (!confirm(`Delete ${ids.length} selected genres?`)) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      if (!Array.isArray(genreIds)) setActionLoading(genreIds);

      await Promise.all(ids.map((id) => api.admin.deleteGenre(id, token)));

      // Update UI
      if (!Array.isArray(genreIds)) {
        setGenres((prev) => prev.filter((genre) => genre.id !== genreIds));
      } else {
        // // Refresh trang hiện tại
        const params = new URLSearchParams();
        if (searchInput) params.append('q', searchInput);

        const response = await api.genres.getAll(token, currentPage, limit);
        setGenres(response.genres);
      }

      toast.success(`${ids.length} genre(s) deleted successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete genre(s)'
      );
    } finally {
      if (!Array.isArray(genreIds)) setActionLoading(null);
    }
  };

  const handleUpdateGenre = async (genreId: string, formData: FormData) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.updateGenre(genreId, formData, token);

      // Refresh trang hiện tại
      const params = new URLSearchParams();
      if (searchInput) params.append('q', searchInput);

      const response = await api.genres.getAll(token, currentPage, limit);
      setGenres(response.genres);

      setEditingGenre(null);
      toast.success('Genre updated successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update genre'
      );
    }
  };

  // Table configuration
  const columns = getGenreColumns({
    theme,
    onDelete: handleDeleteGenres,
    onEdit: setEditingGenre,
  });

  const table = useReactTable({
    data: genres,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updatedSelection) => {
      setRowSelection(updatedSelection);
      const selectedRowData = genres.filter(
        (genre, index) =>
          typeof updatedSelection === 'object' &&
          updatedSelection[index.toString()]
      );
      setSelectedRows(selectedRowData);
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: limit,
      },
    },
    pageCount: totalPages,
    manualPagination: true,
  });

  return (
    <div
      className={`container mx-auto space-y-4 p-4 pb-20 ${
        theme === 'dark' ? 'text-white' : ''
      }`}
    >
      <div className="mb-6">
        <h1
          className={`text-2xl md:text-3xl font-bold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          Genre Management
        </h1>
        <p
          className={`text-muted-foreground ${
            theme === 'dark' ? 'text-white/60' : ''
          }`}
        >
          View and manage music genres
        </p>
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={genres}
        pageCount={totalPages}
        pageIndex={currentPage - 1}
        loading={loading}
        onPageChange={(page) => updateQueryParam('page', page + 1)}
        onRowSelection={setSelectedRows}
        theme={theme}
        toolbar={{
          searchValue: searchInput,
          onSearchChange: setSearchInput,
          selectedRowsCount: selectedRows.length,
          onDelete: () => handleDeleteGenres(selectedRows.map((row) => row.id)),
          showExport: true,
          exportData: {
            data: genres,
            columns: [
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
            ],
            filename: 'genres',
            fetchAllData: async () => {
              const token = localStorage.getItem('userToken');
              if (!token) throw new Error('No authentication token found');
              const response = await api.genres.getAll(token, 1, 10000);
              return response.genres;
            },
          },
          searchPlaceholder: 'Search genres...',
        }}
      />

      <EditGenreModal
        genre={editingGenre}
        onClose={() => setEditingGenre(null)}
        onSubmit={handleUpdateGenre}
        theme={theme}
      />
      <AddGenreModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddGenre}
        theme={theme}
      />
    </div>
  );
}
