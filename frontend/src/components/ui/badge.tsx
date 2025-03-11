'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: '',
        secondary: '',
        destructive: '',
        outline: '',
        success: '', // Thêm variant success để fix lỗi TypeScript
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  const { theme } = useTheme();

  const themeStyles = {
    default:
      theme === 'light'
        ? 'border-transparent bg-neutral-900 text-neutral-50 shadow hover:bg-neutral-900/80 focus:ring-neutral-950'
        : 'border-transparent bg-neutral-50 text-neutral-900 shadow hover:bg-neutral-50/80 focus:ring-neutral-300',
    secondary:
      theme === 'light'
        ? 'border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 focus:ring-neutral-950'
        : 'border-transparent bg-neutral-800 text-neutral-50 hover:bg-neutral-800/80 focus:ring-neutral-300',
    destructive:
      theme === 'light'
        ? 'border-transparent bg-red-500 text-neutral-50 shadow hover:bg-red-500/80 focus:ring-neutral-950'
        : 'border-transparent bg-red-900 text-neutral-50 shadow hover:bg-red-900/80 focus:ring-neutral-300',
    outline:
      theme === 'light'
        ? 'border-neutral-200 text-neutral-950 focus:ring-neutral-950'
        : 'border-neutral-800 text-neutral-50 focus:ring-neutral-300',
    success:
      theme === 'light'
        ? 'border-transparent bg-green-500 text-neutral-50 shadow hover:bg-green-500/80 focus:ring-neutral-950'
        : 'border-transparent bg-green-700 text-neutral-50 shadow hover:bg-green-700/80 focus:ring-neutral-300',
  };

  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        themeStyles[variant || 'default'],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
