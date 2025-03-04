import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const { theme } = useTheme();

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          theme === 'light'
            ? 'border-neutral-200 text-neutral-950 placeholder:text-neutral-400 focus:ring-1 focus:ring-gray-300'
            : 'border-white/[0.1] bg-white/[0.07] text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/20',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
