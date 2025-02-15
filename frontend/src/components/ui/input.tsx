import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          'border-neutral-200 file:text-neutral-950 focus:ring-2 focus:ring-gray-300',
          'dark:border-white/[0.1] dark:bg-white/[0.07] dark:text-white dark:placeholder:text-white/60 dark:file:text-neutral-50 dark:focus:ring-2 dark:focus:ring-white/20',
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
