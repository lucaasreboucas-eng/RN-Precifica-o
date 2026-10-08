import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ children, required, className = '', ...props }) => {
  return (
    <label
      className={`block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-amber-500 ml-1" title="Campo obrigatório">*</span>}
    </label>
  );
};
