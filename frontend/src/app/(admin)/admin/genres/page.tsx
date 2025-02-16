'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Genre } from '@/types';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { DataTableWrapper } from '@/components/data-table/data-table-wrapper';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [editingGenre, setEditingGenre] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Genre[]>([]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const limit = 10;

  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/genres${queryStr}`);
    }
  }, [searchParams, router]);

  const updateQueryParam = (param: string, value: number) => {
    if (totalPages === 1 && value !== 1) return;
    if (value < 1) value = 1;
    if (value > totalPages) value = totalPages;

    if (value === currentPage) return;

    const current = new URLSearchParams(searchParams.toString());
    if (value === 1) {
      current.delete(param);
    } else {
      current.set(param, value.toString());
    }
    const queryStr = current.toString() ? `?${current.toString()}` : '';
    router.push(`/admin/genres${queryStr}`);
  };

  const fetchGenres = React.useCallback(
    async (page: number, query: string = '') => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) throw new Error('No authentication token found');

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (query) {
          params.append('search', query);
        }

        const response = await api.admin.getAllGenres(
          token,
          page,
          limit,
          params.toString()
        );
        setGenres(response.genres);
        setTotalPages(response.pagination.totalPages);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to fetch genres'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (currentPage === 1) {
      fetchGenres(1, searchInput);
    }
  }, [searchInput]);

  useEffect(() => {
    fetchGenres(currentPage, searchInput);
  }, [currentPage, fetchGenres]);

  const handleDeleteGenre = async (genreId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.deleteGenre(genreId, token);
      toast.success('Genre deleted successfully');
      fetchGenres(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete genre'
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (
      !selectedRows.length ||
      !confirm(`Delete ${selectedRows.length} selected genres?`)
    )
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await Promise.all(
        selectedRows.map((row) => api.admin.deleteGenre(row.id, token))
      );
      setSelectedRows([]);
      fetchGenres(currentPage, searchInput);
      toast.success(`Deleted ${selectedRows.length} genres successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  const handleEditGenre = (genre: { id: string; name: string }) => {
    setEditingGenre(genre);
  };

  const handleSaveEdit = async () => {
    if (!editingGenre) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.updateGenre(
        editingGenre.id,
        { name: editingGenre.name },
        token
      );
      toast.success('Genre updated successfully');
      setEditingGenre(null);
      fetchGenres(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update genre'
      );
    }
  };

  const columns: ColumnDef<Genre>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={`translate-y-[2px] ${
            theme === 'dark' ? 'border-white/50' : ''
          }`}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={`translate-y-[2px] ${
            theme === 'dark' ? 'border-white/50' : ''
          }`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.createdAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const genre = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditGenre(genre)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Genre
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteGenre(genre.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Genre
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: genres,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: 10,
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
          onDelete: handleDeleteSelected,
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
              const response = await api.admin.getAllGenres(token, 1, 10000);
              return response.genres;
            },
          },
          searchPlaceholder: 'Search genres...',
        }}
      />

      {/* Edit Genre Modal */}
      {editingGenre && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`p-6 rounded-lg w-full max-w-md ${
              theme === 'light' ? 'bg-white' : 'bg-[#121212]'
            }`}
          >
            <h2
              className={`text-xl font-bold mb-4 ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}
            >
              Edit Genre
            </h2>
            <input
              type="text"
              value={editingGenre.name}
              onChange={(e) =>
                setEditingGenre({ ...editingGenre, name: e.target.value })
              }
              className={`w-full p-2 rounded-md focus:outline-none focus:ring-2 ${
                theme === 'light'
                  ? 'bg-gray-100 focus:ring-gray-300 text-gray-900'
                  : 'bg-white/10 focus:ring-white/20 text-white'
              }`}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="ghost" onClick={() => setEditingGenre(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
