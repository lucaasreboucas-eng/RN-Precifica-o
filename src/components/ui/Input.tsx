import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Label } from './Label';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
  variant?: 'light' | 'dark';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      type = 'text',
      id,
      required,
      className = '',
      disabled,
      variant = 'light',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === 'password';
    const computedType = isPasswordField ? (showPassword ? 'text' : 'password') : type;
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const isDark = variant === 'dark';

    return (
      <div className="w-full text-left">
        {label && (
          <Label htmlFor={inputId} required={required} className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            {label}
          </Label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className={`absolute left-3.5 flex items-center pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={computedType}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={`w-full h-11 rounded-lg border text-sm transition-all duration-200 outline-none
              ${leftIcon ? 'pl-11' : 'pl-3.5'}
              ${rightIcon || isPasswordField ? 'pr-11' : 'pr-3.5'}
              ${
                isDark
                  ? `bg-[#0A1324]/90 text-slate-100 placeholder-slate-500 ${
                      error
                        ? 'border-red-500/80 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-700/80 hover:border-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                    } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/50' : ''}`
                  : `bg-white text-slate-900 placeholder-slate-400 ${
                      error
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                    } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`
              }
              ${className}
            `}
            {...props}
          />

          {isPasswordField ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className={`absolute right-3.5 flex items-center ${isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-400 hover:text-slate-700'} transition-colors focus:outline-none`}
              title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p className={`mt-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
