import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const [bgFailed, setBgFailed] = useState(false);
  const bgImageSrc = '/src/assets/images/login_bg_mesh_1790685026383.jpg';

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between items-center bg-[#070B12] text-slate-100 overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Graphic Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {!bgFailed ? (
          <img
            src={bgImageSrc}
            alt="Ambiente RN Precificação"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0F1E38] via-[#080E1C] to-[#04070D]" />
        )}

        {/* Ambient radial glow lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-blue-900/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-[#070B12] via-[#070B12]/80 to-transparent" />
      </div>

      {/* Top minimal status bar */}
      <div className="relative z-10 w-full max-w-7xl px-4 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Ambiente Seguro</span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span>Criptografia de Ponta a Ponta</span>
        </div>

        <div className="text-xs text-slate-400 font-mono tracking-tight">
          v1.0.0
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md px-4 py-6 sm:py-8 flex flex-col items-center">
        {children}
      </div>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 border-t border-slate-800/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} RN Precificação. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Privacidade</span>
            <span>·</span>
            <span>Termos de Uso</span>
            <span>·</span>
            <span>Suporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
