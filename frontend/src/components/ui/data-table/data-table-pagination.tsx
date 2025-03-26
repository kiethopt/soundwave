'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';

interface DataTablePaginationProps {
  pageCount: number;
  pageIndex: number;
  onPageChange: (page: number) => void;
  theme?: 'light' | 'dark';
}

export function DataTablePagination({
  pageCount,
  pageIndex,
  onPageChange,
  theme = 'light',
}: DataTablePaginationProps) {
  const [pageInput, setPageInput] = useState<string>(
    (pageIndex + 1).toString()
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setPageInput((pageIndex + 1).toString());
  }, [pageIndex]);

  const handleGoToPage = () => {
    const page = Number.parseInt(pageInput, 10);

    // Validations
    if (
      !isNaN(page) &&
      page >= 1 &&
      page <= pageCount &&
      page - 1 !== pageIndex
    ) {
      onPageChange(page - 1);
    } else {
      // Reset input khi số không hợp lệ
      setPageInput((pageIndex + 1).toString());
    }
  };

  return (
    <div className="flex items-center justify-between px-2 mt-4">
      {/* Mobile Pagination */}
      <div className="md:hidden flex w-full items-center justify-between gap-2">
        <Button
          variant={theme === 'dark' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onPageChange?.(pageIndex - 1)}
          disabled={pageIndex === 0}
          className={`${
            theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 text-white disabled:text-white/40 disabled:bg-white/5'
              : 'bg-white hover:bg-gray-200 text-gray-900 disabled:text-gray-400 disabled:bg-gray-100'
          }`}
        >
          Previous
        </Button>

        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger
            className={`px-3 py-2 rounded-md text-sm ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {pageIndex + 1} of {pageCount}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={`p-4 w-[200px] ${
              theme === 'dark'
                ? 'bg-[#282828] border-white/[0.1]'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="space-y-3">
              <div
                className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
              >
                Go to page:
              </div>
              <Input
                type="number"
                min={1}
                max={pageCount}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className={`w-full text-center rounded-md ${
                  theme === 'dark'
                    ? 'bg-white/[0.07] border-white/[0.1] text-white'
                    : 'bg-gray-50 border-gray-200'
                }`}
              />
              <Button
                onClick={handleGoToPage}
                className={`w-full px-3 py-1.5 rounded-lg text-sm ${
                  theme === 'light'
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20'
                }`}
              >
                Go
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={theme === 'dark' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onPageChange?.(pageIndex + 1)}
          disabled={pageIndex === pageCount - 1}
          className={`${
            theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 text-white disabled:text-white/40 disabled:bg-white/5'
              : 'bg-white hover:bg-gray-200 text-gray-900 disabled:text-gray-400 disabled:bg-gray-100'
          }`}
        >
          Next
        </Button>
      </div>

      {/* Desktop Pagination */}
      <div className="hidden md:flex items-center justify-between w-full">
        <Button
          variant={theme === 'dark' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onPageChange?.(pageIndex - 1)}
          disabled={pageIndex === 0}
          className={`${
            theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 text-white disabled:text-white/40 disabled:bg-white/5'
              : 'bg-white hover:bg-gray-200 text-gray-900 disabled:text-gray-400 disabled:bg-gray-100'
          }`}
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <span
            className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
          >
            Page
          </span>
          <Input
            type="number"
            min={1}
            max={pageCount}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className={`w-16 h-8 text-center focus:outline-none ${
              theme === 'dark'
                ? 'bg-white/[0.07] border-white/[0.1] text-white focus:ring-2 focus:ring-white/20'
                : 'focus:ring-2 focus:ring-gray-300'
            }`}
          />
          <span
            className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
          >
            of {pageCount}
          </span>
          <Button
            variant={theme === 'dark' ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleGoToPage}
            className={
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 border-0 text-white'
                : ''
            }
          >
            Go
          </Button>
        </div>

        <Button
          variant={theme === 'dark' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onPageChange?.(pageIndex + 1)}
          disabled={pageIndex === pageCount - 1}
          className={`${
            theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 text-white disabled:text-white/40 disabled:bg-white/5'
              : 'bg-white hover:bg-gray-200 text-gray-900 disabled:text-gray-400 disabled:bg-gray-100'
          }`}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
