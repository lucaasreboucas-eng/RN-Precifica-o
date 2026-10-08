import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  Building2,
  Hash,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import type { Orcamento } from '../../types/orcamento';
import { OrcamentoFormView } from './OrcamentoFormView';
import { formatCurrencyBRL } from '../../utils/pricingEngine';
import { supabase, isSupabaseConfigured, getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const STORAGE_KEY = 'rn_precificacao_orcamentos_prod_v1';

const INITIAL_ORCAMENTOS: Orcamento[] = [];

export const OrcamentosView: React.FC = () => {
  const { user } = useAuth();
  const isGeneralAdmin =
    user?.email?.toLowerCase().trim() === 'adm@rnprecificacao.com.br' ||
    user?.role === 'Administrador Geral';

  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(() => {
    try {
      localStorage.removeItem('rn_precificacao_orcamentos_data_v2');
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ORCAMENTOS;
    } catch {
      return INITIAL_ORCAMENTOS;
    }
  });

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [deletingOrcamento, setDeletingOrcamento] = useState<Orcamento | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOrcamentos = async () => {
      try {
        const client = await getSupabaseClient();
        if (!client) return;

        await client.from('orcamentos').delete().in('id', ['orc-1', 'orc-2', 'orc-3']);

        // First, sync any locally stored quotes that may have been created before Supabase was connected
        let localQuotes: Orcamento[] = [];
        try {
          const rawLocal = localStorage.getItem(STORAGE_KEY);
          if (rawLocal) {
            localQuotes = JSON.parse(rawLocal);
          }
        } catch {
          localQuotes = [];
        }

        const { data, error } = await client
          .from('orcamentos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteIds = new Set(data.map((row: any) => row.id));
          const unsyncedLocal = localQuotes.filter(
            (q) => q.id && !remoteIds.has(q.id) && !['orc-1', 'orc-2', 'orc-3'].includes(q.id)
          );

          if (unsyncedLocal.length > 0) {
            for (const savedOrc of unsyncedLocal) {
              await client.from('orcamentos').upsert({
                id: savedOrc.id,
                os_number: savedOrc.osNumber,
                client_name: savedOrc.clientName,
                date: savedOrc.date,
                responsavel: savedOrc.responsavel,
                status: savedOrc.status,
                parametros: {
                  ...savedOrc.parametros,
                  _createdByEmail: savedOrc.createdByEmail,
                  _createdByUserId: savedOrc.createdByUserId,
                },
                itens: savedOrc.itens,
                total_value: savedOrc.totalValue,
                custo_total: savedOrc.custoTotal || 0,
                base: savedOrc.base || 0,
                updated_at: new Date().toISOString(),
              });
            }
          }

          const mappedRemote: Orcamento[] = data.map((row: any) => ({
            id: row.id,
            osNumber: row.os_number,
            clientName: row.client_name,
            date: row.date,
            responsavel: row.responsavel,
            createdByEmail: row.parametros?._createdByEmail || undefined,
            createdByUserId: row.parametros?._createdByUserId || undefined,
            status: row.status || 'Pendente',
            parametros: row.parametros,
            itens: Array.isArray(row.itens) ? row.itens : [],
            totalValue: Number(row.total_value) || 0,
            custoTotal: Number(row.custo_total) || 0,
            base: Number(row.base) || 0,
          }));

          setOrcamentos([...unsyncedLocal, ...mappedRemote]);
        }
      } catch (err) {
        console.error('Erro ao carregar orçamentos do Supabase:', err);
      }
    };

    loadOrcamentos();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamentos));
  }, [orcamentos]);

  const handleOpenCreate = () => {
    setSelectedOrcamento(null);
    setViewMode('form');
  };

  const handleOpenEdit = (orc: Orcamento) => {
    setSelectedOrcamento(orc);
    setViewMode('form');
  };

  const handleSaveOrcamento = async (savedOrc: Orcamento) => {
    setOrcamentos((prev) => {
      const exists = prev.some((it) => it.id === savedOrc.id);
      if (exists) {
        return prev.map((it) => (it.id === savedOrc.id ? savedOrc : it));
      }
      return [savedOrc, ...prev];
    });

    const client = supabase || (await getSupabaseClient());
    if (client) {
      const { error } = await client.from('orcamentos').upsert({
        id: savedOrc.id,
        os_number: savedOrc.osNumber,
        client_name: savedOrc.clientName,
        date: savedOrc.date,
        responsavel: savedOrc.responsavel,
        status: savedOrc.status,
        parametros: {
          ...savedOrc.parametros,
          _createdByEmail: savedOrc.createdByEmail,
          _createdByUserId: savedOrc.createdByUserId,
        },
        itens: savedOrc.itens,
        total_value: savedOrc.totalValue,
        custo_total: savedOrc.custoTotal || 0,
        base: savedOrc.base || 0,
        updated_at: new Date().toISOString(),
      });
      if (error) console.error('Erro ao salvar orçamento no Supabase:', error.message);
    }

    setViewMode('list');
    setSelectedOrcamento(null);
    setFeedbackMessage(
      `Orçamento ${savedOrc.osNumber} para ${savedOrc.clientName} salvo com sucesso!`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDelete = async () => {
    if (!deletingOrcamento) return;
    const idToDelete = deletingOrcamento.id;
    setOrcamentos((prev) => prev.filter((item) => item.id !== idToDelete));
    setDeletingOrcamento(null);

    const client = supabase || (await getSupabaseClient());
    if (client) {
      const { error } = await client.from('orcamentos').delete().eq('id', idToDelete);
      if (error) console.error('Erro ao excluir orçamento no Supabase:', error.message);
    }

    setFeedbackMessage('Orçamento excluído com sucesso.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  if (viewMode === 'form') {
    return (
      <OrcamentoFormView
        initialOrcamento={selectedOrcamento}
        onSave={handleSaveOrcamento}
        onCancel={() => {
          setViewMode('list');
          setSelectedOrcamento(null);
        }}
      />
    );
  }

  // Regra de visibilidade:
  // - Somente o Administrador Geral (adm@rnprecificacao.com.br) vê todos os orçamentos.
  // - Cada usuário vê apenas os orçamentos que ele mesmo criou.
  const isMasterAdmin = user?.email?.toLowerCase().trim() === 'adm@rnprecificacao.com.br';

  const visibleOrcamentos = orcamentos.filter((orc) => {
    if (isMasterAdmin) return true;

    const currentEmail = user?.email?.toLowerCase().trim();
    const currentUserId = user?.id;
    const currentFullName = user?.fullName?.toLowerCase().trim();

    if (orc.createdByEmail && currentEmail) {
      return orc.createdByEmail.toLowerCase().trim() === currentEmail;
    }
    if (orc.createdByUserId && currentUserId) {
      return orc.createdByUserId === currentUserId;
    }
    if (orc.responsavel && currentFullName) {
      return orc.responsavel.toLowerCase().trim() === currentFullName;
    }
    return false;
  });

  const filteredOrcamentos = visibleOrcamentos.filter((orc) => {
    const term = searchTerm.toLowerCase();
    return (
      orc.osNumber.toLowerCase().includes(term) ||
      orc.clientName.toLowerCase().includes(term)
    );
  });

  const totalGeral = visibleOrcamentos.reduce((acc, curr) => acc + curr.totalValue, 0);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <span>Orçamentos</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Histórico completo de orçamentos e acompanhamento de propostas de serviços.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo Orçamento
        </Button>
      </div>

      {feedbackMessage && (
        <Alert type="success" onClose={() => setFeedbackMessage(null)}>
          {feedbackMessage}
        </Alert>
      )}

      {/* Barra de Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por número da OS ou nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Tabela de Histórico de Orçamentos */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg text-slate-900">
              Histórico de Orçamentos Realizados
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {filteredOrcamentos.length} registro(s)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Número da OS</th>
                  <th className="py-3.5 px-4 sm:px-6">Nome do Cliente</th>
                  <th className="py-3.5 px-4 sm:px-6">Valor do Orçamento</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrcamentos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Nenhum orçamento encontrado. Clique em "Novo Orçamento".
                    </td>
                  </tr>
                ) : (
                  filteredOrcamentos.map((orc) => (
                    <tr
                      key={orc.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Número da OS */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                          <Hash className="w-3.5 h-3.5" />
                        </span>
                        <span>{orc.osNumber}</span>
                      </td>

                      {/* Nome do Cliente */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-800 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[280px] sm:max-w-none">
                            {orc.clientName}
                          </span>
                        </div>
                      </td>

                      {/* Valor do Orçamento */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-700 font-mono">
                        {formatCurrencyBRL(orc.totalValue)}
                      </td>

                      {/* Botões de Ação */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(orc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
                            title="Editar orçamento"
                            aria-label="Editar orçamento"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden md:inline font-medium">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingOrcamento(orc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir orçamento"
                            aria-label="Excluir orçamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={Boolean(deletingOrcamento)}
        onClose={() => setDeletingOrcamento(null)}
        title="Excluir Orçamento"
        description="Confirmar a exclusão do orçamento."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Deseja realmente excluir o orçamento{' '}
            <strong className="text-amber-700 font-mono">
              {deletingOrcamento?.osNumber}
            </strong>{' '}
            do cliente{' '}
            <strong className="text-slate-900">
              {deletingOrcamento?.clientName}
            </strong>
            ? Esta ação é irreversível.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingOrcamento(null)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
