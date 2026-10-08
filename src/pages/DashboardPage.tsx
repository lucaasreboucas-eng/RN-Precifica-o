import React from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Database,
  ArrowRight,
  LogOut,
  FolderGit2,
  Layers,
  Sparkles,
  Calculator,
  Server,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export interface DashboardPageProps {
  onOpenSupabaseModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenSupabaseModal }) => {
  const { user, signOut, isConfigured } = useAuth();

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F1E38] via-[#122345] to-[#0A1324] border border-amber-500/25 p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-semibold uppercase tracking-wider">
              Área Restrita Autenticada
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-slate-400 text-xs">Sessão Segura Ativa</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Olá, <span className="text-gold-gradient">{user?.fullName || 'Gestor'}</span>!
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Bem-vindo à base do sistema <strong className="text-white">RN Precificação</strong>. A infraestrutura de autenticação, design system e arquitetura de módulos estão prontas para expansão.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSupabaseModal}
              leftIcon={<Database className="w-4 h-4 text-amber-400" />}
            >
              Status Supabase ({isConfigured ? 'Produção' : 'Demonstração'})
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={signOut}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Encerrar Sessão
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Foundations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Architecture Card */}
        <Card variant="glass" className="border-slate-800">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">Estrutura &amp; Design System</CardTitle>
            <CardDescription>
              Componentes padronizados (Button, Input, Card, Modal, Alert, Logo) alinhados à identidade visual RN.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pronto para novos módulos</span>
            </div>
          </CardContent>
        </Card>

        {/* Supabase Auth Card */}
        <Card variant="glass" className="border-slate-800">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">Supabase Authentication</CardTitle>
            <CardDescription>
              Login por e-mail/senha, recuperação, sessão persistente e proteção de rotas privadas configurada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sessão: {user?.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* GitHub & Vercel Card */}
        <Card variant="glass" className="border-slate-800">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-400 mb-3">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">GitHub &amp; Vercel</CardTitle>
            <CardDescription>
              Variáveis de ambiente isoladas em <code className="text-amber-300">.env.example</code> e build modular pronto para CI/CD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuração de deploy concluída</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Step Roadmap Banner */}
      <Card variant="bordered" className="bg-[#0C1527]/90">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Próxima Etapa do Projeto</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                Fase 2: Motor de Precificação e Gestão de Orçamentos
              </h3>
            </div>
          </div>
          <CardDescription>
            Conforme solicitado, a estrutura base e a tela de login foram concluídas sem avançar ainda nos cálculos e tabelas de orçamento. O sistema aguarda seu comando para implementar a lógica de negócio de precificação.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {[
              { title: 'Tabelas Supabase', desc: 'Estruturação de tabelas de orçamentos, itens e frotas' },
              { title: 'Cálculo de Margem', desc: 'Fórmula de precificação, BDI e custos diretos' },
              { title: 'Emissão de PDF', desc: 'Exportação e compartilhamento com o cliente' },
              { title: 'Histórico & Status', desc: 'Acompanhamento de aprovações e pedidos' },
            ].map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#091120] border border-slate-800 text-left"
              >
                <div className="text-[11px] font-mono text-amber-400/80 mb-1">
                  0{idx + 1}. Módulo
                </div>
                <div className="text-xs font-semibold text-slate-200">{step.title}</div>
                <div className="text-[11px] text-slate-400 mt-1">{step.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
