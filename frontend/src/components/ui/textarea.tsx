import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const { theme } = useTheme();

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          theme === 'light'
            ? 'border-neutral-200 bg-white text-neutral-950 placeholder:text-neutral-400 focus:ring-1 focus:ring-gray-300'
            : 'border-white/[0.1] bg-white/[0.07] text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/20',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
