import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

const variants = {
  default: 'bg-blue-bright/10 text-blue-bright',
  gold: 'bg-gold/20 text-amber-800 dark:text-amber-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  whatsapp: 'bg-[#dcf8c6] text-[#075e54] dark:bg-[#075e54] dark:text-[#dcf8c6]',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
