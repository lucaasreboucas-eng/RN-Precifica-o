import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'dark';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  className = '',
  ...props
}) => {
  const variantStyles = {
    glass: 'bg-white border border-slate-200/90 shadow-xs text-slate-800',
    default: 'bg-white border border-slate-200 shadow-xs text-slate-800',
    bordered: 'bg-white border-2 border-amber-400/40 shadow-xs text-slate-800',
    dark: 'bg-gradient-to-b from-[#0F1E38]/85 to-[#091224]/95 backdrop-blur-xl border border-slate-700/60 shadow-xl shadow-black/40 text-slate-100',
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 overflow-hidden ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-6 pb-4 sm:p-8 sm:pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3
      className={`text-xl sm:text-2xl font-bold tracking-tight text-slate-900 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <p className={`text-sm text-slate-500 mt-1.5 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-6 pt-2 sm:p-8 sm:pt-2 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`p-6 pt-0 sm:p-8 sm:pt-0 border-t border-slate-100 mt-4 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
