import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  Calendar,
  Car,
  User,
  Hash,
  FilterX,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Alert } from '../ui/Alert';
import type { Movimentacao } from '../../types/estoque';
import { generateRelatorioMovimentacoesPdf } from '../../utils/movimentacoesPdfGenerator';
import { RelatorioPdfModal } from './RelatorioPdfModal';

const MOV_STORAGE_KEY = 'rn_precificacao_movimentacoes_prod_v1';
const DELETED_MOV_KEY = 'rn_precificacao_deleted_movimentacoes_v1';

const getLocalDeletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_MOV_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((id) => typeof id === 'string' && id.trim().length > 0));
      }
    }
  } catch {}
  return new Set<string>();
};

const formatDateTimeBR = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const getLocalDateYMD = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
};

export const RelatoriosView: React.FC = () => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(() => {
    try {
      const deletedIds = getLocalDeletedIds();
      const saved = localStorage.getItem(MOV_STORAGE_KEY);
      if (saved) {
        const parsed: Movimentacao[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m) => m && m.id && !deletedIds.has(m.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // 1. Filtros de pesquisa (Data Inicial, Data Final, Placa do Veículo, Responsável)
  const [dataInicio, setDataInicio] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [filterPlaca, setFilterPlaca] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');

  // Seleção de movimentações (IDs selecionados)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Mensagem de validação / orientação
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Visualização do PDF gerado
  const [pdfModalData, setPdfModalData] = useState<{
    url: string;
    filename: string;
    count: number;
  } | null>(null);

  // Carrega movimentações atualizadas do servidor e localStorage (somente leitura)
  useEffect(() => {
    let isMounted = true;

    const loadMovimentacoes = async () => {
      try {
        const deletedIds = getLocalDeletedIds();
        const res = await fetch('/api/store');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.deletedMovimentacaoIds)) {
            data.deletedMovimentacaoIds.forEach((id: string) => {
              if (typeof id === 'string' && id.trim()) deletedIds.add(id);
            });
          }

          let localMovs: Movimentacao[] = [];
          try {
            const rawLocal = localStorage.getItem(MOV_STORAGE_KEY);
            if (rawLocal) {
              const parsed = JSON.parse(rawLocal);
              if (Array.isArray(parsed)) {
                localMovs = parsed.filter((m: Movimentacao) => m && m.id && !deletedIds.has(m.id));
              }
            }
          } catch {}

          const serverMovs: Movimentacao[] = Array.isArray(data.movimentacoes)
            ? data.movimentacoes.filter((m: any) => m && m.id && !deletedIds.has(m.id))
            : [];
          const serverIds = new Set(serverMovs.map((m) => m.id));
          const localOnly = localMovs.filter((m) => !serverIds.has(m.id));
          setMovimentacoes([...serverMovs, ...localOnly]);
        }
      } catch {
        // Mantém dados carregados do localStorage
      }
    };

    loadMovimentacoes();

    const intervalId = setInterval(loadMovimentacoes, 5000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Revoga ObjectURL anterior quando modal fecha ou novo PDF é gerado
  useEffect(() => {
    return () => {
      if (pdfModalData?.url) {
        URL.revokeObjectURL(pdfModalData.url);
      }
    };
  }, [pdfModalData]);

  // Aplicação independente ou combinada dos filtros
  const filteredMovimentacoes = useMemo(() => {
    const placaTerm = filterPlaca.trim().toLowerCase();
    const respTerm = filterResponsavel.trim().toLowerCase();

    return movimentacoes.filter((mov) => {
      if (placaTerm && !mov.placaVeiculo.toLowerCase().includes(placaTerm)) {
        return false;
      }

      if (respTerm && !mov.responsavel.toLowerCase().includes(respTerm)) {
        return false;
      }

      if (dataInicio || dataFinal) {
        const movYMD = getLocalDateYMD(mov.dataHora);
        if (!movYMD) return false;
        if (dataInicio && movYMD < dataInicio) return false;
        if (dataFinal && movYMD > dataFinal) return false;
      }

      return true;
    });
  }, [movimentacoes, dataInicio, dataFinal, filterPlaca, filterResponsavel]);

  const hasActiveFilters = Boolean(
    dataInicio || dataFinal || filterPlaca.trim() || filterResponsavel.trim()
  );

  const handleClearFilters = () => {
    setDataInicio('');
    setDataFinal('');
    setFilterPlaca('');
    setFilterResponsavel('');
  };

  // Apenas considera seleções que pertencem aos registros filtrados atuais
  const selectedFilteredMovimentacoes = useMemo(() => {
    return filteredMovimentacoes.filter((mov) => selectedIds.has(mov.id));
  }, [filteredMovimentacoes, selectedIds]);

  const allFilteredSelected =
    filteredMovimentacoes.length > 0 &&
    filteredMovimentacoes.every((mov) => selectedIds.has(mov.id));

  const toggleSelectOne = (id: string) => {
    setWarningMessage(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setWarningMessage(null);
    if (filteredMovimentacoes.length === 0) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredMovimentacoes.forEach((m) => next.delete(m.id));
      } else {
        filteredMovimentacoes.forEach((m) => next.add(m.id));
      }
      return next;
    });
  };

  const handleGeneratePdf = () => {
    if (selectedFilteredMovimentacoes.length === 0) {
      setWarningMessage(
        'Selecione pelo menos uma movimentação na tabela antes de gerar o relatório em PDF.'
      );
      return;
    }

    setWarningMessage(null);

    const result = generateRelatorioMovimentacoesPdf(selectedFilteredMovimentacoes, {
      dataInicio: dataInicio || undefined,
      dataFinal: dataFinal || undefined,
      placa: filterPlaca || undefined,
      responsavel: filterResponsavel || undefined,
    });

    // Tenta abrir em nova aba via elemento <a> (sem window.open) para visualizador nativo de PDF
    try {
      const link = document.createElement('a');
      link.href = result.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}

    // Também disponibiliza visualizador integrado com Imprimir / Baixar PDF / Abrir em Nova Aba
    setPdfModalData({
      url: result.url,
      filename: result.filename,
      count: selectedFilteredMovimentacoes.length,
    });
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header com botão "Imprimir / Gerar PDF" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span>Relatórios de Movimentações</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão de Estoque · Consulte, filtre, selecione movimentações e gere relatórios em PDF.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleGeneratePdf}
          leftIcon={<Printer className="w-4 h-4" />}
        >
          Imprimir / Gerar PDF
          {selectedFilteredMovimentacoes.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-950/15 text-slate-950">
              {selectedFilteredMovimentacoes.length}
            </span>
          )}
        </Button>
      </div>

      {warningMessage && (
        <Alert type="warning" onClose={() => setWarningMessage(null)}>
          {warningMessage}
        </Alert>
      )}

      {/* 1. Filtros de Pesquisa */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Data Inicial
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full h-10 pl-8 pr-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Data Final
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-full h-10 pl-8 pr-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Placa do Veículo
              </label>
              <div className="relative">
                <Car className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ex: ABC-1D23"
                  value={filterPlaca}
                  onChange={(e) => setFilterPlaca(e.target.value.toUpperCase())}
                  className="w-full h-10 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Responsável
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nome do responsável"
                  value={filterResponsavel}
                  onChange={(e) => setFilterResponsavel(e.target.value)}
                  className="w-full h-10 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                leftIcon={<FilterX className="w-4 h-4" />}
                className="w-full h-10 text-xs text-slate-700 border-slate-300 hover:bg-slate-100 disabled:opacity-50"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tabela de Movimentações */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base sm:text-lg text-slate-900">
                Movimentações Encontradas
              </CardTitle>
              <span className="text-xs text-slate-500 font-mono">
                {filteredMovimentacoes.length} registro(s)
              </span>
            </div>

            {filteredMovimentacoes.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-medium">
                  {selectedFilteredMovimentacoes.length} selecionada(s)
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-amber-700" />
                  )}
                  <span>{allFilteredSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}</span>
                </button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-24 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      disabled={filteredMovimentacoes.length === 0}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 disabled:opacity-40"
                      title="Selecionar Todas"
                    >
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={handleToggleSelectAll}
                        disabled={filteredMovimentacoes.length === 0}
                        aria-label="Selecionar Todas"
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>Selecionar</span>
                    </button>
                  </th>
                  <th className="py-3.5 px-4 sm:px-5">Data e Hora</th>
                  <th className="py-3.5 px-4 sm:px-5">Produtos Movimentados</th>
                  <th className="py-3.5 px-4 sm:px-5">Placa do Veículo</th>
                  <th className="py-3.5 px-4 sm:px-5">Modelo do Veículo</th>
                  <th className="py-3.5 px-4 sm:px-5">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      {hasActiveFilters
                        ? 'Nenhuma movimentação encontrada para os filtros aplicados.'
                        : 'Nenhuma movimentação registrada no sistema.'}
                    </td>
                  </tr>
                ) : (
                  filteredMovimentacoes.map((mov) => {
                    const isChecked = selectedIds.has(mov.id);
                    return (
                      <tr
                        key={mov.id}
                        onClick={() => toggleSelectOne(mov.id)}
                        className={`cursor-pointer transition-colors align-top ${
                          isChecked ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Selecionar */}
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOne(mov.id)}
                            aria-label={`Selecionar movimentação ${mov.placaVeiculo}`}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>

                        {/* Data e Hora */}
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {formatDateTimeBR(mov.dataHora)}
                        </td>

                        {/* Produtos Movimentados */}
                        <td className="py-3.5 px-4 sm:px-5">
                          <div className="space-y-1.5">
                            {mov.itens.map((item, idx) => (
                              <div
                                key={`${mov.id}-${item.produtoId}-${idx}`}
                                className="flex items-center gap-2 text-xs bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5"
                              >
                                <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                  {item.codigo}
                                </span>
                                <span className="text-slate-800 font-medium flex-1 min-w-0 break-words">
                                  {item.descricao}
                                </span>
                                <span className="font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                                  Qtd: {item.quantidade}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Placa do Veículo */}
                        <td className="py-3.5 px-4 sm:px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs">
                            <Hash className="w-3 h-3 text-slate-500" />
                            <span>{mov.placaVeiculo}</span>
                          </span>
                        </td>

                        {/* Modelo do Veículo */}
                        <td className="py-3.5 px-4 sm:px-5 text-slate-800 font-medium">
                          {mov.modeloVeiculo}
                        </td>

                        {/* Responsável */}
                        <td className="py-3.5 px-4 sm:px-5 text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{mov.responsavel}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Visualização / Impressão / Download do PDF */}
      <RelatorioPdfModal
        isOpen={Boolean(pdfModalData)}
        onClose={() => setPdfModalData(null)}
        pdfUrl={pdfModalData?.url || null}
        filename={pdfModalData?.filename || ''}
        count={pdfModalData?.count || 0}
      />
    </div>
  );
};
