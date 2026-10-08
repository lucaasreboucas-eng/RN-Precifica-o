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

const STORAGE_KEY = 'rn_precificacao_orcamentos_data_v2';

const INITIAL_ORCAMENTOS: Orcamento[] = [
  {
    id: 'orc-1',
    osNumber: 'OS-1045',
    clientName: 'Transportadora Silva & Filhos Ltda',
    date: '2026-09-28',
    responsavel: 'Lucas Rebouças',
    status: 'Aprovado',
    parametros: {
      margemLucroPercent: 30,
      impostoFaturamentoPercent: 6,
      taxaAdministrativaPercent: 5,
      comissaoVendedorPercent: 3,
      issPercent: 2,
      antecipacaoPercent: 1.5,
    },
    itens: [
      {
        id: 'it-1',
        produto: 'Retífica de Virabrequim Scania DC13',
        descricao: 'Polimento e alinhamento micrométrico',
        quantidade: 1,
        custoUnitario: 3500,
      },
      {
        id: 'it-2',
        produto: 'Jogo de Bronzinas de Biela e Mancal',
        descricao: 'Medida 0,25mm STD',
        quantidade: 1,
        custoUnitario: 1200,
      },
    ],
    totalValue: 7392.62,
    custoTotal: 4700,
    base: 6110,
  },
  {
    id: 'orc-2',
    osNumber: 'OS-1046',
    clientName: 'Frotas Express Distribuidora',
    date: '2026-09-27',
    responsavel: 'Carlos Alberto Mendes',
    status: 'Em Análise',
    parametros: {
      margemLucroPercent: 25,
      impostoFaturamentoPercent: 6,
      taxaAdministrativaPercent: 5,
      comissaoVendedorPercent: 3,
      issPercent: 2,
      antecipacaoPercent: 1.5,
    },
    itens: [
      {
        id: 'it-3',
        produto: 'Usinagem de Cabeçote Volvo FH',
        descricao: 'Assentamento de válvulas e plaina de face',
        quantidade: 1,
        custoUnitario: 2100,
      },
    ],
    totalValue: 3176.04,
    custoTotal: 2100,
    base: 2625,
  },
  {
    id: 'orc-3',
    osNumber: 'OS-1047',
    clientName: 'Logística TransRodoviária Sul',
    date: '2026-09-26',
    responsavel: 'Lucas Rebouças',
    status: 'Pendente',
    parametros: {
      margemLucroPercent: 35,
      impostoFaturamentoPercent: 6,
      taxaAdministrativaPercent: 5,
      comissaoVendedorPercent: 3,
      issPercent: 2,
      antecipacaoPercent: 1.5,
    },
    itens: [
      {
        id: 'it-4',
        produto: 'Recondicionamento de Bloco Mercedes OM457',
        descricao: 'Encamisamento e retífica de alojamentos',
        quantidade: 1,
        custoUnitario: 5800,
      },
      {
        id: 'it-5',
        produto: 'Kit de Pistões com Pinos e Travas',
        descricao: 'Kit original Mahle',
        quantidade: 6,
        custoUnitario: 480,
      },
    ],
    totalValue: 14185.73,
    custoTotal: 8680,
    base: 11718,
  },
];

export const OrcamentosView: React.FC = () => {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(() => {
    try {
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

  const handleSaveOrcamento = (savedOrc: Orcamento) => {
    setOrcamentos((prev) => {
      const exists = prev.some((it) => it.id === savedOrc.id);
      if (exists) {
        return prev.map((it) => (it.id === savedOrc.id ? savedOrc : it));
      }
      return [savedOrc, ...prev];
    });

    setViewMode('list');
    setSelectedOrcamento(null);
    setFeedbackMessage(
      `Orçamento ${savedOrc.osNumber} para ${savedOrc.clientName} salvo com sucesso!`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDelete = () => {
    if (!deletingOrcamento) return;
    setOrcamentos((prev) => prev.filter((item) => item.id !== deletingOrcamento.id));
    setDeletingOrcamento(null);
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

  const filteredOrcamentos = orcamentos.filter((orc) => {
    const term = searchTerm.toLowerCase();
    return (
      orc.osNumber.toLowerCase().includes(term) ||
      orc.clientName.toLowerCase().includes(term)
    );
  });

  const totalGeral = orcamentos.reduce((acc, curr) => acc + curr.totalValue, 0);

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
