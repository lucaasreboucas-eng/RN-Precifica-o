import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14] disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap active:scale-[0.98]';

    // Variant mapping
    const variantClasses = {
      primary:
        'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-950/30 hover:brightness-110 hover:shadow-amber-500/20 active:brightness-95',
      secondary:
        'bg-[#121E36] hover:bg-[#1A2A4C] text-slate-100 border border-slate-700/60 shadow-sm active:bg-[#0F1A30]',
      outline:
        'bg-transparent hover:bg-slate-800/40 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/50',
      ghost:
        'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-100',
      danger:
        'bg-red-600/90 hover:bg-red-600 text-white shadow-sm shadow-red-950/40 border border-red-500/30',
    };

    // Size mapping
    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12 font-medium',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span className="truncate">{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
