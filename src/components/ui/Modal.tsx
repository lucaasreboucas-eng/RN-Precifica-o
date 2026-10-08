import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  variant = 'light',
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const isDark = variant === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 ${
          isDark ? 'bg-[#04070D]/80 backdrop-blur-md' : 'bg-slate-900/50 backdrop-blur-xs'
        } transition-opacity duration-300`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`relative w-full ${maxWidthClasses[maxWidth]} ${
          isDark
            ? 'bg-gradient-to-b from-[#0F1E38] to-[#0A1324] border border-amber-500/25 shadow-2xl shadow-black/80 text-slate-100'
            : 'bg-white border border-slate-200/90 shadow-xl text-slate-800'
        } rounded-2xl overflow-hidden transform transition-all duration-300 z-10`}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between p-6 pb-4 ${
            isDark ? 'border-b border-slate-800/80' : 'border-b border-slate-100'
          }`}
        >
          <div>
            {title && (
              <h3
                id="modal-title"
                className={`text-lg font-bold tracking-tight ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors -mr-1 -mt-1 ${
              isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
