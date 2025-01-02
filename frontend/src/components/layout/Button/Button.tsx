import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'default', size = 'default', ...props },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus:outline-none disabled:opacity-50';

    const variants = {
      default: 'bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90',
      destructive: 'bg-red-500 text-neutral-50 hover:bg-red-500/90',
      outline: 'border border-neutral-200 bg-white hover:bg-neutral-100',
      secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80',
      ghost: 'hover:bg-neutral-100 hover:text-neutral-900',
      link: 'text-neutral-900 hover:underline underline-offset-4',
    };

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-8',
      icon: 'h-9 w-9',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return <button ref={ref} className={classes} {...props} />;
  }
);

Button.displayName = 'Button';

export { Button };
