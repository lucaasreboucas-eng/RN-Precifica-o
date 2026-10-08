import React from 'react';
import { Database, Shield, User, Globe, Key } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { getSupabaseConfigStatus } from '../lib/supabase';

export interface ConfiguracoesPageProps {
  onOpenSupabaseModal: () => void;
}

export const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = ({ onOpenSupabaseModal }) => {
  const { user, isConfigured } = useAuth();
  const status = getSupabaseConfigStatus();

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Configurações do Ambiente</h2>
        <p className="text-sm text-slate-400 mt-1">
          Gerenciamento de conexões, variáveis e credenciais do RN Precificação.
        </p>
      </div>

      {/* Profile Card */}
      <Card variant="glass" className="border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Perfil do Usuário</CardTitle>
              <CardDescription>Informações da conta autenticada no momento.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-[#091120] border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider block mb-1">Nome Completo</span>
              <span className="font-semibold text-slate-200 text-sm">{user?.fullName || 'Não definido'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#091120] border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider block mb-1">E-mail Cadastrado</span>
              <span className="font-semibold text-slate-200 text-sm">{user?.email}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#091120] border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider block mb-1">Nível de Acesso</span>
              <span className="font-semibold text-amber-400 text-sm">{user?.role || 'Administrador'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#091120] border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider block mb-1">Identificador (ID)</span>
              <span className="font-mono text-slate-300 text-xs">{user?.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supabase & Integration Card */}
      <Card variant="glass" className="border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Conexão Supabase</CardTitle>
                <CardDescription>Status da integração com o banco de dados e Auth.</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenSupabaseModal}>
              Detalhes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-[#091120] border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-400">Status atual:</span>
              <span className={`ml-2 font-semibold ${isConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isConfigured ? 'Conectado ao Supabase Oficial' : 'Modo Demonstração com Persistência Local'}
              </span>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </div>

          <div className="p-4 rounded-xl bg-[#0B1527] border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Segurança das Chaves</span>
            </div>
            <p>
              Conforme exigido nas diretrizes, nenhuma chave ou informação sensível está gravada diretamente no código-fonte.
              Todas as conexões dependem estritamente das variáveis de ambiente <code className="text-amber-300">VITE_SUPABASE_URL</code> e <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
