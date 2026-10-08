import React from 'react';
import { Database, CheckCircle2, AlertTriangle, ExternalLink, Shield } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getSupabaseConfigStatus } from '../../lib/supabase';

export interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const status = getSupabaseConfigStatus();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Status da Integração Supabase"
      description="Gerenciamento de banco de dados e autenticação segura para o RN Precificação."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Status indicator box */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            status.isConfigured
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}
        >
          {status.isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}

          <div className="text-left text-xs sm:text-sm">
            <h4 className="font-semibold text-white">
              {status.isConfigured
                ? 'Conexão Supabase Ativa'
                : 'Modo Demonstração / Aguardando Credenciais'}
            </h4>
            <p className="mt-1 text-slate-300 leading-relaxed text-xs">
              {status.isConfigured
                ? `O aplicativo está conectado ao projeto Supabase (${status.rawUrl}). Todas as autenticações e sessões são persistidas no servidor.`
                : 'As variáveis de ambiente do Supabase ainda não foram preenchidas. O sistema opera normalmente com autenticação de demonstração e persistência local.'}
            </p>
          </div>
        </div>

        {/* Variables checklist */}
        <div className="bg-[#0A1324] border border-slate-800 rounded-xl p-4 text-left space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Variáveis de Ambiente
          </h5>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="font-mono text-slate-300">VITE_SUPABASE_URL</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  status.urlConfigured
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {status.urlConfigured ? 'Configurado' : 'Pendente'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="font-mono text-slate-300">VITE_SUPABASE_ANON_KEY</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  status.keyConfigured
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {status.keyConfigured ? 'Configurado' : 'Pendente'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#0F1E38]/40 border border-amber-500/20 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <Shield className="w-4 h-4" />
            <span>Como Conectar Seu Projeto Supabase</span>
          </div>
          <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Crie ou acesse seu projeto no painel do <strong className="text-white">Supabase</strong>.</li>
            <li>Vá em <strong className="text-white">Project Settings &gt; API</strong> e copie a Project URL e a chave anon/public.</li>
            <li>Adicione no seu arquivo <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">.env</code> local ou nas variáveis de ambiente da <strong className="text-white">Vercel</strong>.</li>
            <li>No Supabase, certifique-se de que o provedor <strong className="text-white">Email</strong> está ativo em <strong className="text-white">Authentication &gt; Providers</strong>.</li>
          </ol>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  );
};
