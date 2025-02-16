'use client';

import { Button } from '@/components/ui/button';
import { Search, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel } from '@/utils/export-to-excel';
import { debounce } from 'lodash';
import React from 'react';
import { DataTableFilter } from './data-table-filter';

interface DataTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedRowsCount?: number;
  onDelete?: () => void;
  showExport?: boolean;
  exportData?: {
    data: any[];
    columns: { key: string; header: string }[];
    filename: string;
  };
  statusFilter?: {
    value: string[];
    onChange: (value: string[]) => void;
  };
  table: any;
  theme?: 'light' | 'dark';
  searchPlaceholder?: string;
}

function ColumnToggle({
  table,
  theme,
}: {
  table: any;
  theme?: 'light' | 'dark';
}) {
  if (!table) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={theme === 'dark' ? 'secondary' : 'outline'} size="sm">
          View <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={theme === 'dark' ? 'bg-white border-white/10' : ''}
      >
        {table
          .getAllColumns()
          .filter((column: any) => column.getCanHide())
          .map((column: any) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => {
                  column.toggleVisibility(!!value);
                }}
              >
                {column.id === 'artistName'
                  ? 'Artist Name'
                  : column.id === 'verificationRequestedAt'
                  ? 'Requested At'
                  : column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  selectedRowsCount = 0,
  onDelete,
  showExport = false,
  exportData,
  table,
  theme = 'light',
  searchPlaceholder = 'Search request...',
  statusFilter,
}: DataTableToolbarProps) {
  const debouncedSearch = React.useCallback(
    debounce((value: string) => {
      onSearchChange(value);
    }, 300),
    [onSearchChange]
  );

  const handleExport = () => {
    if (!exportData) return;
    const { data, columns, filename } = exportData;
    exportToExcel(data, columns, filename);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Update local state immediately for UI feedback
    e.target.value = value;
    // Debounce the actual search
    debouncedSearch(value);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <div className="relative w-[150px] flex-shrink-0">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
            theme === 'dark' ? 'text-white/40' : 'text-muted-foreground'
          }`}
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          defaultValue={searchValue}
          onChange={handleSearchChange}
          className={`w-full h-9 pl-9 pr-4 text-sm rounded-md outline-none border ${
            theme === 'dark'
              ? 'bg-transparent border-white/[0.1] text-white placeholder:text-white/60'
              : 'bg-white border-gray-300'
          }`}
        />
      </div>

      <div className="flex items-center gap-2">
        {statusFilter && (
          <>
            <DataTableFilter
              title="Status"
              options={[
                { label: 'Active', value: 'true' },
                { label: 'Inactive', value: 'false' },
              ]}
              value={statusFilter.value}
              onChange={statusFilter.onChange}
              theme={theme}
            />
            {statusFilter.value.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => statusFilter.onChange([])}
                className={`h-9 px-2 ${
                  theme === 'dark'
                    ? 'bg-white/[0.07] border-white/[0.1] text-white hover:bg-white/[0.1]'
                    : ''
                }`}
              >
                Reset
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {selectedRowsCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className={`flex-shrink-0 ${
              theme === 'dark' ? 'bg-red-500/80 hover:bg-red-500' : ''
            }`}
          >
            Delete ({selectedRowsCount})
          </Button>
        )}
        {showExport && (
          <Button
            variant={theme === 'dark' ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleExport}
            className="flex-shrink-0 justify-center min-w-[80px]"
          >
            Export
          </Button>
        )}
        {table && (
          <div className="flex-shrink-0">
            <ColumnToggle table={table} theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}
