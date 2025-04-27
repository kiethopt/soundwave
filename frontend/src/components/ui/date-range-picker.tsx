'use client';

import * as React from 'react';
import DatePicker from 'react-datepicker';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

import 'react-datepicker/dist/react-datepicker.css';

interface DateRangePickerProps {
  onChange: (dates: { startDate: string; endDate: string }) => void;
  startDate: string; // 'yyyy-MM-dd' or empty string
  endDate: string;   // 'yyyy-MM-dd' or empty string
  className?: string;
}

// Helper function để chuyển đổi chuỗi 'yyyy-MM-dd' thành Date hoặc null
const parseDateString = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
};

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
}: DateRangePickerProps) {
  const { theme } = useTheme();

  const [startDateObj, setStartDateObj] = React.useState<Date | null>(parseDateString(startDate));
  const [endDateObj, setEndDateObj] = React.useState<Date | null>(parseDateString(endDate));

  React.useEffect(() => {
    setStartDateObj(parseDateString(startDate));
  }, [startDate]);

  React.useEffect(() => {
    setEndDateObj(parseDateString(endDate));
  }, [endDate]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDateObj(start);
    setEndDateObj(end);

    onChange({
      startDate: start ? format(start, 'yyyy-MM-dd') : '',
      endDate: end ? format(end, 'yyyy-MM-dd') : '',
    });
  };

  const CustomInput = React.forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(({ value, onClick }, ref) => (
    <Button
      variant={theme === 'light' ? 'outline' : 'secondary'}
      className={cn(
        'w-full h-10 justify-start text-left font-normal',
        !startDateObj && !endDateObj && 'text-muted-foreground',
        theme === 'light'
          ? 'border border-neutral-200 text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-gray-300'
          : 'bg-white/[0.07] border border-white/[0.1] text-neutral-50 hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20'
      )}
      onClick={onClick}
      ref={ref}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {startDateObj ? (
        endDateObj ? (
          <>
            {format(startDateObj, 'dd/MM/yy')} - {format(endDateObj, 'dd/MM/yy')}
          </>
        ) : (
          format(startDateObj, 'dd/MM/yy')
        )
      ) : (
        <span>Select date range...</span>
      )}
    </Button>
  ));
  CustomInput.displayName = 'CustomInput';

  return (
    <div className={cn('grid gap-2', className)}>
      <DatePicker
        selectsRange={true}
        startDate={startDateObj}
        endDate={endDateObj}
        onChange={handleDateChange}
        dateFormat="dd/MM/yyyy"
        isClearable={true}
        placeholderText="Select date range..."
        customInput={<CustomInput />}
        className="w-full"
        calendarClassName={cn(
            theme === 'dark' ? 'react-datepicker--dark' : 'react-datepicker--light'
        )}
        popperPlacement="bottom-start"
      />
    </div>
  );
}
