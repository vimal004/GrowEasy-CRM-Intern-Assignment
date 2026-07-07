import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150 select-none border w-fit',
  {
    variants: {
      variant: {
        default: 'bg-primary-container text-primary-onContainer border-transparent',
        success: 'bg-success/10 text-success border-success/20',
        warning: 'bg-warning/10 text-warning border-warning/20',
        error: 'bg-error/10 text-error border-error/20',
        neutral: 'bg-on-background/5 text-on-background/70 border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function StatusBadge({ className, variant, ...props }: StatusBadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function getCrmStatusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'SALE_DONE':
      return 'success';
    case 'GOOD_LEAD_FOLLOW_UP':
      return 'success';
    case 'DID_NOT_CONNECT':
      return 'warning';
    case 'BAD_LEAD':
      return 'error';
    default:
      return 'neutral';
  }
}

export function formatCrmStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
