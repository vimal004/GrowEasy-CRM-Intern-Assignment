import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 ease-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-35 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        filled: 'bg-primary text-white hover:shadow-elevation1 hover:bg-opacity-90',
        tonal: 'bg-primary-container text-primary-onContainer hover:bg-opacity-80 hover:shadow-elevation1',
        elevated: 'bg-surface text-primary shadow-elevation1 hover:shadow-elevation2 hover:bg-primary/5',
        outlined: 'bg-transparent text-primary border border-border hover:bg-primary/5 hover:border-primary/30',
        text: 'bg-transparent text-primary hover:bg-primary/5',
      },
      size: {
        sm: 'h-8 px-4 text-xs rounded-full',
        md: 'h-10 px-6 rounded-full',
        lg: 'h-12 px-8 text-base rounded-full',
      },
    },
    defaultVariants: {
      variant: 'filled',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
