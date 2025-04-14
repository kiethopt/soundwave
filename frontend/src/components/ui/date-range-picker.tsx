'use client';

import * as React from 'react';
import { format, isValid } from 'date-fns';
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
import { useTheme } from '@/contexts/ThemeContext';

interface DateRangePickerProps {
  onChange: (dates: { startDate: string; endDate: string }) => void;
  startDate: string;
  endDate: string;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
}: DateRangePickerProps) {
  const { theme } = useTheme();
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const initialFrom = startDate && isValid(new Date(startDate)) ? new Date(startDate) : undefined;
    const initialTo = endDate && isValid(new Date(endDate)) ? new Date(endDate) : undefined;
    if (initialFrom || initialTo) {
      return { from: initialFrom, to: initialTo };
    }
    return undefined;
  });

  React.useEffect(() => {
    const propFrom = startDate && isValid(new Date(startDate)) ? new Date(startDate) : undefined;
    const propTo = endDate && isValid(new Date(endDate)) ? new Date(endDate) : undefined;
    
    if (
      (propFrom?.getTime() !== date?.from?.getTime()) ||
      (propTo?.getTime() !== date?.to?.getTime())
    ) {
        if (propFrom || propTo) {
            setDate({ from: propFrom, to: propTo });
        } else {
            setDate(undefined);
        }
    }
  }, [startDate, endDate]);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);

    let newStartDate = '';
    let newEndDate = '';

    if (range?.from && isValid(range.from)) {
      newStartDate = format(range.from, 'yyyy-MM-dd');
      if (range.to && isValid(range.to)) {
        newEndDate = format(range.to, 'yyyy-MM-dd');
      } else {
        newEndDate = '';
      }
    } else {
      newStartDate = '';
      newEndDate = '';
    }
    
    onChange({ startDate: newStartDate, endDate: newEndDate });
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={theme === 'light' ? 'outline' : 'secondary'}
            className={cn(
              'w-[250px] sm:w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              theme === 'light'
                ? 'border border-neutral-200 text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-gray-300'
                : 'bg-white/[0.07] border border-white/[0.1] text-neutral-50 hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20'
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
          className={cn(
            'w-auto p-0',
            theme === 'light'
              ? 'bg-white border-neutral-200 text-neutral-950'
              : '  border-white/[0.1] text-neutral-50'
          )}
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            modifiers={{
              selected: date ?? [],
            }}
            modifiersStyles={{
              selected: {
                backgroundColor: theme === 'light' ? '#ffaa3b' : '#eab308',
                color: theme === 'light' ? '#ffffff' : '#111827',
                fontWeight: 'bold',
              },
              range_start: {
                backgroundColor: theme === 'light' ? '#ffaa3b' : '#eab308',
                color: theme === 'light' ? '#ffffff' : '#111827',
                borderTopLeftRadius: '50%',
                borderBottomLeftRadius: '50%',
                borderTopRightRadius: '0', 
                borderBottomRightRadius: '0', 
              },
              range_end: {
                backgroundColor: theme === 'light' ? '#ffaa3b' : '#eab308',
                color: theme === 'light' ? '#ffffff' : '#111827',
                borderTopLeftRadius: '0', 
                borderBottomLeftRadius: '0', 
                borderTopRightRadius: '50%',
                borderBottomRightRadius: '50%',
              },
              range_middle: { 
                backgroundColor: theme === 'light' ? '#ffedd5' : 'rgba(234, 179, 8, 0.2)', 
                color: theme === 'light' ? '#9a3412' : '#fef3c7', 
                borderRadius: '0',
              }
            }}
            className={cn(
              'max-h-[350px] overflow-y-auto',
              theme === 'light'
                ? 'bg-white text-neutral-950'
                : 'bg-[#282828] text-neutral-50'
            )}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
