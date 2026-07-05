'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  whatsapp: 'btn-whatsapp',
  ghost: 'text-ink-soft hover:text-blue-deep dark:hover:text-white transition-colors',
  outline:
    'inline-flex items-center justify-center gap-2 rounded-full border border-blue-bright/30 px-6 py-3 font-mono text-xs uppercase tracking-wider text-blue-deep dark:text-white hover:bg-blue-bright/10 transition-all duration-200 hover:-translate-y-0.5',
};

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-xs',
  lg: 'px-8 py-4 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(variants[variant], sizes[size], loading && 'cursor-wait opacity-70', disabled && 'cursor-not-allowed opacity-50', className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
