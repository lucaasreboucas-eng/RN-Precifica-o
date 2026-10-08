import React, { useState } from 'react';
import brandLogoImg from '../../assets/images/rn_brand_logo_1790685016122.jpg';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  orientation = 'vertical',
  className = '',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Bundled logo asset (also served as /favicon.jpg)
  const logoSrc = brandLogoImg || '/favicon.jpg';

  const sizeDimensions = {
    sm: { img: 'w-8 h-8', title: 'text-sm', sub: 'text-[9px]' },
    md: { img: 'w-12 h-12', title: 'text-base', sub: 'text-[10px]' },
    lg: { img: 'w-20 h-20 sm:w-24 sm:h-24', title: 'text-xl sm:text-2xl', sub: 'text-xs' },
    xl: { img: 'w-28 h-28 sm:w-32 sm:h-32', title: 'text-2xl sm:text-3xl', sub: 'text-sm' },
  }[size];

  return (
    <div
      className={`inline-flex items-center ${
        orientation === 'vertical' ? 'flex-col text-center' : 'flex-row text-left gap-3'
      } ${className}`}
    >
      {/* Emblem / Shield Container */}
      <div className={`relative ${sizeDimensions.img} shrink-0 group`}>
        {/* Glow ambient aura */}
        <div className="absolute -inset-1 rounded-2xl bg-amber-500/15 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />

        {!imageFailed ? (
          <img
            src={logoSrc}
            alt="RN Precificação Logo"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="relative w-full h-full object-contain rounded-xl drop-shadow-[0_4px_12px_rgba(212,175,55,0.25)] select-none"
          />
        ) : (
          /* High-fidelity CSS/SVG Fallback adhering to Zero-Broken-Image Policy */
          <div className="relative w-full h-full rounded-xl bg-gradient-to-b from-[#162744] via-[#0E1A30] to-[#0A1324] border-2 border-amber-400/80 shadow-lg shadow-black/80 flex items-center justify-center p-1.5 overflow-hidden">
            <svg viewBox="0 0 100 120" className="w-full h-full" fill="none">
              <defs>
                <linearGradient id="goldRim" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFF1B8" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#8A6B19" />
                </linearGradient>
                <linearGradient id="silverChrome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#CBD5E1" />
                  <stop offset="100%" stopColor="#64748B" />
                </linearGradient>
              </defs>
              {/* Shield Outline */}
              <path
                d="M50 5 L88 20 L88 65 Q88 95 50 115 Q12 95 12 65 L12 20 Z"
                fill="#0D1829"
                stroke="url(#goldRim)"
                strokeWidth="4"
              />
              {/* Inner Shield Rim */}
              <path
                d="M50 12 L82 24 L82 64 Q82 90 50 108 Q18 90 18 64 L18 24 Z"
                stroke="url(#goldRim)"
                strokeWidth="1.5"
                opacity="0.7"
              />
              {/* RN Typography */}
              <text
                x="50"
                y="52"
                textAnchor="middle"
                fill="url(#silverChrome)"
                fontFamily="Rajdhani, sans-serif"
                fontWeight="700"
                fontSize="32"
                letterSpacing="1.5"
              >
                RN
              </text>
              {/* Piston & Gear silhouette */}
              <rect x="44" y="62" width="12" height="14" rx="2" fill="url(#goldRim)" />
              <path d="M42 66 L58 66 M42 70 L58 70" stroke="#0D1829" strokeWidth="1.5" />
              <circle cx="50" cy="73" r="2.5" fill="#0D1829" />
              <rect x="47" y="76" width="6" height="12" fill="url(#goldRim)" />
              {/* Gear teeth arch */}
              <path
                d="M32 78 Q50 92 68 78"
                stroke="url(#goldRim)"
                strokeWidth="3"
                strokeDasharray="2 3"
                fill="none"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Typography */}
      {showText && (
        <div className={orientation === 'vertical' ? 'mt-3' : ''}>
          <div className="flex items-center gap-1 justify-center">
            <h1
              className={`font-display font-bold tracking-wider uppercase text-white ${sizeDimensions.title}`}
            >
              RN{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                Precificação
              </span>
            </h1>
          </div>
          <p
            className={`font-medium tracking-widest uppercase text-slate-400 ${sizeDimensions.sub}`}
          >
            Gestão &amp; Orçamentos
          </p>
        </div>
      )}
    </div>
  );
};
