'use client';

import type { Table } from '@tanstack/react-table';
import { DataTable } from './data-table';
import { DataTableToolbar } from './data-table-toolbar';
import React from 'react';

type Theme = 'light' | 'dark' | undefined;

interface DataTableWrapperProps<TData> {
  table: Table<TData>;
  columns: any[];
  data: TData[];
  pageCount: number;
  pageIndex: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onRowSelection?: (rows: TData[]) => void;
  theme?: Theme;
  toolbar?: {
    searchValue: string;
    onSearchChange: (value: string) => void;
    selectedRowsCount?: number;
    onDelete?: () => void;
    onActivate?: () => void;
    onDeactivate?: () => void;
    showExport?: boolean;
    exportData?: {
      data: any[];
      columns: any[];
      filename: string;
      fetchAllData?: () => Promise<any[]>;
    };
    searchPlaceholder?: string;
    statusFilter?: {
      value: string[];
      onChange: (value: string[]) => void;
    };
    genreFilter?: {
      value: string[];
      onChange: (value: string[]) => void;
      options: { value: string; label: string }[];
    };
    verifiedFilter?: {
      value: string[];
      onChange: (value: string[]) => void;
    };
  };
}

export function DataTableWrapper<TData>({
  table,
  columns,
  data,
  pageCount,
  pageIndex,
  loading,
  onPageChange,
  onRowSelection,
  theme,
  toolbar,
}: DataTableWrapperProps<TData>) {
  const handleSearchChange = React.useCallback(
    (value: string) => {
      if (toolbar?.onSearchChange) {
        toolbar.onSearchChange(value);
      }
    },
    [toolbar]
  );
  return (
    <div className="space-y-4">
      {toolbar && (
        <DataTableToolbar
          searchValue={toolbar.searchValue}
          onSearchChange={handleSearchChange}
          selectedRowsCount={toolbar.selectedRowsCount}
          onDelete={toolbar.onDelete}
          onActivate={toolbar.onActivate}
          onDeactivate={toolbar.onDeactivate}
          showExport={toolbar.showExport}
          exportData={toolbar.exportData}
          table={table}
          theme={theme}
          searchPlaceholder={toolbar.searchPlaceholder}
          statusFilter={toolbar.statusFilter}
          genreFilter={toolbar.genreFilter}
          verifiedFilter={toolbar.verifiedFilter}
        />
      )}

      <DataTable
        table={table}
        columns={columns}
        data={data}
        pageCount={pageCount}
        pageIndex={pageIndex}
        loading={loading}
        onPageChange={onPageChange}
        onRowSelection={onRowSelection}
        theme={theme}
      />
    </div>
  );
}
