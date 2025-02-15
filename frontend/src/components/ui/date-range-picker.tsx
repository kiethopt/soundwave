'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
  theme?: 'light' | 'dark';
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  theme = 'light',
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  });

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);

    // Reset both dates if range is cleared
    if (!range?.from) {
      onStartDateChange('');
      onEndDateChange('');
      return;
    }

    // Update start date
    const formattedStart = format(range.from, 'yyyy-MM-dd');
    onStartDateChange(formattedStart);

    // Update or clear end date
    if (range.to) {
      const formattedEnd = format(range.to, 'yyyy-MM-dd');
      onEndDateChange(formattedEnd);
    } else {
      onEndDateChange('');
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={theme === 'dark' ? 'secondary' : 'outline'}
            className={cn(
              'w-[250px] sm:w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              theme === 'dark'
                ? 'bg-white/[0.07] border border-white/[0.1] hover:bg-white/[0.1] text-white focus:outline-none focus:ring-2 focus:ring-white/20'
                : 'border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yy')} -{' '}
                  {format(date.to, 'dd/MM/yy')}
                </>
              ) : (
                format(date.from, 'dd/MM/yy')
              )
            ) : (
              <span>Pick dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={`w-auto p-0 ${
            theme === 'dark' ? 'bg-[#282828] border-white/10' : ''
          }`}
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            className={`max-h-[350px] overflow-y-auto ${
              theme === 'dark' ? 'bg-[#282828] text-white' : ''
            }`}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
