'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
  VisibilityState,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableLoading } from './data-table-loading';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import React from 'react';

interface DataTableProps<TData, TValue> {
  table: any;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pageIndex?: number;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  onRowSelection?: (rows: TData[]) => void;
  meta?: any;
  theme?: 'light' | 'dark';
  onSortingChange?: (sorting: SortingState) => void;
}

export function DataTable<TData, TValue>({
  table,
  columns,
  data,
  pageCount = 1,
  pageIndex = 0,
  loading = false,
  onPageChange,
  onRowSelection,
  meta,
  theme = 'light',
  onSortingChange,
}: DataTableProps<TData, TValue>) {
  // Reset  row khi data thay đổi
  React.useEffect(() => {
    table.resetRowSelection();
  }, [data, table]);

  React.useEffect(() => {
    if (onRowSelection) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((row: any) => row.original);
      onRowSelection(selectedRows);
    }
  }, [table.getState().rowSelection, table, onRowSelection]);

  return (
    <div className="relative">
      <div
        className={`rounded-md border overflow-x-auto ${
          theme === 'dark'
            ? 'border-white/[0.08] bg-[#121212]'
            : 'border-gray-200 bg-white'
        }`}
      >
        <Table>
          <TableHeader
            className={
              theme === 'dark'
                ? 'border-white/[0.08] rounded-t-lg'
                : 'border-gray-200 rounded-t-lg'
            }
          >
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow
                key={headerGroup.id}
                className={
                  theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
                }
              >
                {headerGroup.headers.map((header: any) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className={`h-10 px-4 text-left align-middle font-medium whitespace-nowrap ${
                        header.id === 'actions'
                          ? `sticky right-0 ${
                              theme === 'dark' ? 'bg-[#121212]' : 'bg-white'
                            }`
                          : ''
                      } ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="ghost"
                          className={`-ml-4 h-8 data-[state=open]:bg-accent ${
                            theme === 'dark'
                              ? 'hover:bg-white/10 hover:text-white'
                              : ''
                          }`}
                          onClick={() =>
                            header.column.toggleSorting(
                              header.column.getIsSorted() === 'asc'
                            )
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: any) => (
                <TableRow
                  key={row.id}
                  className={`${
                    theme === 'dark'
                      ? 'border-white/[0.08] hover:bg-white/[0.02]'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell
                      key={cell.id}
                      className={`px-4 py-2 align-middle whitespace-nowrap ${
                        cell.column.id === 'actions'
                          ? `sticky right-0 ${
                              theme === 'dark' ? 'bg-[#121212]' : 'bg-white'
                            }`
                          : ''
                      } ${theme === 'dark' ? 'text-white' : ''}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className={`h-24 text-center ${
                    theme === 'dark' ? 'text-white/60' : ''
                  }`}
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 0 && (
        <DataTablePagination
          pageCount={pageCount}
          pageIndex={pageIndex}
          onPageChange={onPageChange || (() => {})}
          theme={theme}
        />
      )}

      {loading && <DataTableLoading theme={theme} />}
    </div>
  );
}
