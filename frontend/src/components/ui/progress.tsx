'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    const { theme } = useTheme();
    
    return (
      <div
        ref={ref}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full',
          theme === 'light' ? 'bg-gray-200' : 'bg-gray-700',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'absolute top-0 left-0 h-full transition-all duration-300 ease-in-out',
            theme === 'light' ? 'bg-blue-500' : 'bg-[#A57865]'
          )}
          style={{ 
            width: `${value}%`
          }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress }; 