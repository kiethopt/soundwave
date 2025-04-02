'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Label } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
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
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { getLabelColumns } from '@/components/ui/data-table/data-table-columns';
import { useDataTable } from '@/hooks/useDataTable';
import {
  AddLabelModal,
  EditLabelModal,
} from '@/components/ui/data-table/data-table-modals';

export default function LabelManagement() {
  const { theme } = useTheme();
  const limit = 10;

  // Use custom hook useDataTable
  const {
    data: labels,
    setData: setLabels,
    loading,
    totalPages,
    currentPage,
    actionLoading,
    setActionLoading,
    searchInput,
    setSearchInput,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
  } = useDataTable<Label>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const search = params.get('search') || '';
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      if (search) queryParams.append('search', search);

      const response = await api.labels.getAll(
        token,
        page,
        limit,
        queryParams.toString()
      );
      return {
        data: response.labels || [],
        pagination: response.pagination || { totalPages: 1 },
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
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);

  // Centralized data refresh function
  const refreshData = useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      if (searchInput) params.append('search', searchInput);

      const response = await api.labels.getAll(
        token,
        currentPage,
        limit,
        params.toString()
      );
      setLabels(response.labels || []);
    } catch (error) {
      console.error('Failed to refresh labels:', error);
      toast.error('Could not refresh label list.');
    }
  }, [currentPage, searchInput, limit, setLabels]);

  // Action handlers
  const handleAddLabel = async (formData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required');
      return;
    }
    try {
      await api.labels.create(formData, token);
      toast.success('Label created successfully');
      refreshData();
    } catch (error) {
      toast.error('Failed to create label');
      console.error(error);
    }
  };

  // Handle events to open modal from button in column
  useEffect(() => {
    const handleOpenModal = () => setIsAddModalOpen(true);
    window.addEventListener('openAddLabelModal', handleOpenModal);
    return () =>
      window.removeEventListener('openAddLabelModal', handleOpenModal);
  }, []);

  const handleDeleteLabels = async (labelIds: string | string[]) => {
    const ids = Array.isArray(labelIds) ? labelIds : [labelIds];
    if (!confirm(`Delete ${ids.length} selected label(s)?`)) return;

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    const isBulk = Array.isArray(labelIds);
    setActionLoading(isBulk ? 'bulkDelete' : ids[0]);

    try {
      await Promise.all(ids.map((id) => api.labels.delete(id, token)));
      toast.success(`${ids.length} label(s) deleted successfully`);
      setSelectedRows([]);
      setRowSelection({});
      refreshData();
    } catch (error) {
      toast.error('Failed to delete label(s)');
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateLabel = async (labelId: string, formData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required');
      return;
    }
    try {
      await api.labels.update(labelId, formData, token);
      toast.success('Label updated successfully');
      setEditingLabel(null);
      refreshData();
    } catch (error) {
      toast.error('Failed to update label');
      console.error(error);
    }
  };

  // Table configuration
  const columns = getLabelColumns({
    theme,
    onDelete: handleDeleteLabels,
    onEdit: setEditingLabel,
  });

  const table = useReactTable({
    data: labels,
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
        pageSize: limit,
      },
    },
    pageCount: totalPages,
    manualPagination: true,
  });

  // Update selectedRows state when table rowSelection changes
  useEffect(() => {
    const selectedRowData = table
      .getSelectedRowModel()
      .flatRows.map((row) => row.original);
    setSelectedRows(selectedRowData);
  }, [rowSelection, table, setSelectedRows]);

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
          Label Management
        </h1>
        <p
          className={`text-muted-foreground ${
            theme === 'dark' ? 'text-white/60' : ''
          }`}
        >
          View and manage record labels
        </p>
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={labels}
        pageCount={totalPages}
        pageIndex={currentPage - 1}
        loading={loading || !!actionLoading}
        onPageChange={(page) => updateQueryParam({ page: page + 1 })}
        theme={theme}
        toolbar={{
          searchValue: searchInput,
          onSearchChange: setSearchInput,
          selectedRowsCount: selectedRows.length,
          onDelete: () => handleDeleteLabels(selectedRows.map((row) => row.id)),
          showExport: true,
          exportData: {
            data: labels,
            columns: [
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'description', header: 'Description' },
              { key: '_count.tracks', header: 'Tracks Count' },
              { key: '_count.albums', header: 'Albums Count' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
            ],
            filename: 'labels',
            fetchAllData: async () => {
              const token = localStorage.getItem('userToken');
              if (!token) throw new Error('No authentication token found');
              const response = await api.labels.getAll(token, 1, 10000);
              return response.labels || [];
            },
          },
          searchPlaceholder: 'Search labels...',
        }}
      />

      <AddLabelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddLabel}
        theme={theme}
      />

      <EditLabelModal
        label={editingLabel}
        onClose={() => setEditingLabel(null)}
        onSubmit={handleUpdateLabel}
        theme={theme}
      />
    </div>
  );
}
