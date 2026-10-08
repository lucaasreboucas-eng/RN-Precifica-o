import React from 'react';
import { Clock, ArrowLeft, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export interface ComingSoonPageProps {
  moduleName: string;
  onBackToDashboard: () => void;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  moduleName,
  onBackToDashboard,
}) => {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card variant="glass" className="border-amber-500/20 text-center">
        <CardHeader className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-4">
            <Clock className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl">{moduleName}</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-2">
            Este módulo faz parte do escopo da <strong className="text-white">Fase 2</strong>. Na etapa atual, a prioridade foi estabelecer a autenticação, segurança e o design system do RN Precificação.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <div className="p-4 rounded-xl bg-[#091120] border border-slate-800 text-left text-xs text-slate-300 max-w-md w-full">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
              <Shield className="w-4 h-4" />
              <span>Diretriz do Projeto Respeitada</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              "Neste primeiro momento, NÃO desenvolva as funcionalidades de precificação ou orçamento. Quero desenvolver apenas a estrutura inicial do aplicativo e a tela de login."
            </p>
          </div>
          <Button variant="primary" onClick={onBackToDashboard} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Voltar para Visão Geral
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
