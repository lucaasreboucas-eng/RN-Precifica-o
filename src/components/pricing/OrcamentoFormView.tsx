import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  FileText,
  DollarSign,
  PieChart,
  Percent,
  CheckCircle2,
  Building,
  Layers,
  Paperclip,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import type {
  Orcamento,
  OrcamentoItem,
  PricingParameters,
} from '../../types/orcamento';
import {
  calculatePricing,
  formatCurrencyBRL,
} from '../../utils/pricingEngine';

interface OrcamentoFormViewProps {
  initialOrcamento?: Orcamento | null;
  onSave: (orcamento: Orcamento) => void;
  onCancel: () => void;
}

const DEFAULT_PARAMS: PricingParameters = {
  margemLucroPercent: 30, // 30%
  impostoFaturamentoPercent: 6, // 6%
  taxaAdministrativaPercent: 5, // 5%
  comissaoVendedorPercent: 3, // 3%
  issPercent: 2, // 2%
  antecipacaoPercent: 1.5, // 1.5%
};

const DEFAULT_ITEMS: OrcamentoItem[] = [
  {
    id: 'item-1',
    produto: 'Retífica de Bloco de Motor Diesel',
    descricao: 'Usinagem completa, brunimento de camisas e teste de trincas',
    quantidade: 1,
    custoUnitario: 3200,
  },
  {
    id: 'item-2',
    produto: 'Jogo de Pistões e Anéis Forjados',
    descricao: 'Substituição por peças originais com tolerância calibrada',
    quantidade: 6,
    custoUnitario: 450,
  },
];

export const OrcamentoFormView: React.FC<OrcamentoFormViewProps> = ({
  initialOrcamento,
  onSave,
  onCancel,
}) => {
  const { user } = useAuth();
  const usuarioLogado = user?.fullName || 'Usuário';

  // Cabeçalho do Orçamento
  const [osNumber, setOsNumber] = useState(
    initialOrcamento?.osNumber || `OS-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [clientName, setClientName] = useState(
    initialOrcamento?.clientName || ''
  );
  const [date, setDate] = useState(
    initialOrcamento?.date || new Date().toISOString().split('T')[0]
  );
  const [responsavel] = useState(
    initialOrcamento?.responsavel || usuarioLogado
  );

  // Parâmetros do Orçamento
  const [params, setParams] = useState<PricingParameters>(
    initialOrcamento?.parametros || DEFAULT_PARAMS
  );

  // Itens do Orçamento
  const [itens, setItens] = useState<OrcamentoItem[]>(
    initialOrcamento?.itens || (initialOrcamento ? [] : DEFAULT_ITEMS)
  );

  // Modal Adicionar / Editar Item
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<OrcamentoItem | null>(null);
  const [itemProduto, setItemProduto] = useState('');
  const [itemDescricao, setItemDescricao] = useState('');
  const [itemQuantidade, setItemQuantidade] = useState<string>('1');
  const [itemCustoUnitario, setItemCustoUnitario] = useState<string>('');
  const [itemError, setItemError] = useState('');

  // Validação ao salvar
  const [saveError, setSaveError] = useState('');

  // Anexo de Documento de Cotação
  const cotacaoInputRef = useRef<HTMLInputElement | null>(null);
  const [isParsingCotacao, setIsParsingCotacao] = useState(false);
  const [cotacaoFeedback, setCotacaoFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Centralized calculations in real time
  const calc = calculatePricing(itens, params);

  const handleAttachCotacao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingCotacao(true);
    setCotacaoFeedback(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let mimeType = file.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'csv') mimeType = 'text/csv';
        else if (ext === 'txt') mimeType = 'text/plain';
        else if (ext === 'xml') mimeType = 'text/xml';
        else mimeType = 'application/pdf';
      }

      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Falha ao ler o arquivo anexado.'));
        reader.readAsDataURL(file);
      });

      let rawText: string | undefined;
      if (['csv', 'txt', 'xml', 'html'].includes(ext) || mimeType.startsWith('text/')) {
        rawText = await file.text();
      }

      const response = await fetch('/api/parse-cotacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType,
          fileName: file.name,
          rawText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao processar o documento de cotação.');
      }

      const extracted = Array.isArray(data?.itens) ? data.itens : [];
      if (extracted.length === 0) {
        setCotacaoFeedback({
          type: 'error',
          message:
            'Nenhum item com os campos "Código Descrição da Peça" e "Qte." foi encontrado no documento.',
        });
        return;
      }

      const importedItems: OrcamentoItem[] = extracted.map(
        (row: { codigoDescricao?: string; qte?: number }, idx: number) => {
          const descPeca = String(row.codigoDescricao || '').trim() || `Peça #${idx + 1}`;
          const qtdFromQte = Number(row.qte) || 1;
          return {
            id: `item-${Date.now()}-${idx}`,
            produto: descPeca,
            descricao: descPeca,
            quantidade: qtdFromQte,
            custoUnitario: 0,
          };
        }
      );

      setItens((prev) => {
        const isOnlyDefault =
          prev.length === DEFAULT_ITEMS.length &&
          prev.every((it, i) => it.id === DEFAULT_ITEMS[i].id);
        return isOnlyDefault ? importedItems : [...prev, ...importedItems];
      });

      setCotacaoFeedback({
        type: 'success',
        message: `${importedItems.length} item(ns) importado(s) da cotação "${file.name}" com sucesso!`,
      });
    } catch (err: any) {
      setCotacaoFeedback({
        type: 'error',
        message: err?.message || 'Falha ao ler o documento de cotação.',
      });
    } finally {
      setIsParsingCotacao(false);
      e.target.value = '';
    }
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemProduto('');
    setItemDescricao('');
    setItemQuantidade('1');
    setItemCustoUnitario('');
    setItemError('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: OrcamentoItem) => {
    setEditingItem(item);
    setItemProduto(item.produto);
    setItemDescricao(item.descricao);
    setItemQuantidade(item.quantidade.toString());
    setItemCustoUnitario(item.custoUnitario.toString());
    setItemError('');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setItemError('');

    if (!itemProduto.trim()) {
      setItemError('Informe o nome do item/produto.');
      return;
    }

    const qty = parseFloat(itemQuantidade.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      setItemError('A quantidade deve ser um número maior que zero.');
      return;
    }

    const unitCost = parseFloat(
      itemCustoUnitario.replace(/[R$\s.]/g, '').replace(',', '.')
    );
    if (isNaN(unitCost) || unitCost < 0) {
      setItemError('Informe um custo unitário válido.');
      return;
    }

    if (editingItem) {
      setItens((prev) =>
        prev.map((it) =>
          it.id === editingItem.id
            ? {
                ...it,
                produto: itemProduto.trim(),
                descricao: itemDescricao.trim(),
                quantidade: qty,
                custoUnitario: unitCost,
              }
            : it
        )
      );
    } else {
      const newItem: OrcamentoItem = {
        id: `item-${Date.now()}`,
        produto: itemProduto.trim(),
        descricao: itemDescricao.trim(),
        quantidade: qty,
        custoUnitario: unitCost,
      };
      setItens((prev) => [...prev, newItem]);
    }

    setIsItemModalOpen(false);
  };

  const handleConfirmDeleteItem = () => {
    if (!deletingItem) return;
    setItens((prev) => prev.filter((it) => it.id !== deletingItem.id));
    setDeletingItem(null);
  };

  const handleParamChange = (field: keyof PricingParameters, value: string) => {
    const sanitized = value.replace(',', '.');
    const num = parseFloat(sanitized);
    setParams((prev) => ({
      ...prev,
      [field]: isNaN(num) || num < 0 ? 0 : num,
    }));
  };

  const handleSaveOrcamento = () => {
    setSaveError('');

    if (!osNumber.trim()) {
      setSaveError('Informe o número da OS do orçamento.');
      return;
    }
    if (!clientName.trim()) {
      setSaveError('Informe o nome do cliente.');
      return;
    }
    if (itens.length === 0) {
      setSaveError('Adicione pelo menos um item ao orçamento.');
      return;
    }
    if (!calc.isDenominadorValido) {
      setSaveError(
        'O denominador de cálculo é inválido (<= 0). Por favor, revise os percentuais de impostos e taxas nos Parâmetros do Orçamento.'
      );
      return;
    }

    const orcamentoToSave: Orcamento = {
      id: initialOrcamento?.id || `orc-${Date.now()}`,
      osNumber: osNumber.trim(),
      clientName: clientName.trim(),
      date,
      responsavel: (responsavel || usuarioLogado).trim(),
      status: initialOrcamento?.status || 'Pendente',
      parametros: params,
      itens,
      totalValue: calc.valorFinalVenda,
      custoTotal: calc.custoTotal,
      base: calc.base,
    };

    onSave(orcamentoToSave);
  };

  return (
    <div className="space-y-8 text-left pb-16">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-slate-600 hover:text-slate-900"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{initialOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}</span>
              <span className="text-amber-700 font-mono text-base font-semibold bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                {osNumber || 'OS-NOVA'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Formação de preços, cálculos tributários e demonstrativo de resultado em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveOrcamento}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Salvar Orçamento
          </Button>
        </div>
      </div>

      {saveError && (
        <Alert type="error" onClose={() => setSaveError('')}>
          {saveError}
        </Alert>
      )}

      {/* 1. Cabeçalho do Orçamento */}
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-900">
            <Building className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              1. Cabeçalho do Orçamento
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Número do Orçamento (OS) *
              </label>
              <input
                type="text"
                value={osNumber}
                onChange={(e) => setOsNumber(e.target.value)}
                placeholder="Ex: OS-1049"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 font-mono font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cliente *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Transportadora Santos & Cia Ltda"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data do Orçamento
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Responsável
              </label>
              <input
                type="text"
                value={responsavel || usuarioLogado}
                readOnly
                disabled
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 font-semibold cursor-not-allowed shadow-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Parâmetros do Orçamento */}
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <Percent className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                2. Parâmetros do Orçamento
              </CardTitle>
            </div>
            <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Alíquotas e Margens Percentuais (%)
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Margem de Lucro */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Margem de Lucro (%)
                </label>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded">
                  Sobre Custo
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.margemLucroPercent}
                  onChange={(e) =>
                    handleParamChange('margemLucroPercent', e.target.value)
                  }
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Aplicada diretamente sobre o Custo Total dos itens.
              </p>
            </div>

            {/* Imposto sobre Faturamento */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Imposto sobre Faturamento (%)
                </label>
                <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-medium">
                  Sobre Venda
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.impostoFaturamentoPercent}
                  onChange={(e) =>
                    handleParamChange('impostoFaturamentoPercent', e.target.value)
                  }
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Calculado sobre o Valor Final Faturado.
              </p>
            </div>

            {/* Taxa Administrativa */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Taxa Administrativa (%)
                </label>
                <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-medium">
                  Sobre Venda
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.taxaAdministrativaPercent}
                  onChange={(e) =>
                    handleParamChange('taxaAdministrativaPercent', e.target.value)
                  }
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Deduzida da venda antes da comissão.
              </p>
            </div>

            {/* Comissão do Vendedor */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Comissão do Vendedor (%)
                </label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                  Sobre Líquido Empresa
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.comissaoVendedorPercent}
                  onChange={(e) =>
                    handleParamChange('comissaoVendedorPercent', e.target.value)
                  }
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Calculada sobre o recebido após a Taxa Administrativa.
              </p>
            </div>

            {/* ISS sobre Faturamento */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  ISS sobre Faturamento (%)
                </label>
                <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-medium">
                  Sobre Venda
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.issPercent}
                  onChange={(e) => handleParamChange('issPercent', e.target.value)}
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Calculado sobre o Valor Final Faturado.
              </p>
            </div>

            {/* Antecipação sobre Faturamento */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Antecipação sobre Faturamento (%)
                </label>
                <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-medium">
                  Sobre Venda
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={params.antecipacaoPercent}
                  onChange={(e) =>
                    handleParamChange('antecipacaoPercent', e.target.value)
                  }
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Calculada sobre o Valor Final Faturado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Itens do Orçamento */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Layers className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                3. Itens do Orçamento
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={cotacaoInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt,.xml"
                onChange={handleAttachCotacao}
                className="hidden"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => cotacaoInputRef.current?.click()}
                isLoading={isParsingCotacao}
                leftIcon={<Paperclip className="w-4 h-4" />}
              >
                Anexar Cotação
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenAddItem}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Adicionar Item
              </Button>
            </div>
          </div>
        </CardHeader>

        {cotacaoFeedback && (
          <div className="px-4 sm:px-6 pt-3">
            <Alert
              type={cotacaoFeedback.type}
              onClose={() => setCotacaoFeedback(null)}
            >
              {cotacaoFeedback.message}
            </Alert>
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 sm:px-6 w-20">Item</th>
                  <th className="py-3 px-4 sm:px-6">Produto</th>
                  <th className="py-3 px-4 sm:px-6 text-center">Quantidade</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Custo Unitário (R$)</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Custo Total (R$)</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum item adicionado ao orçamento ainda. Clique em "Adicionar Item".
                    </td>
                  </tr>
                ) : (
                  itens.map((item, idx) => {
                    const itemTotalCost = item.quantidade * item.custoUnitario;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-mono text-amber-700 font-bold">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-900 font-medium">
                          {item.produto}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-center font-mono font-semibold text-slate-700">
                          {item.quantidade}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right font-mono text-slate-700">
                          {formatCurrencyBRL(item.custoUnitario)}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-amber-700">
                          {formatCurrencyBRL(itemTotalCost)}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Editar item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Excluir item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Total Geral dos Custos */}
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td
                    colSpan={4}
                    className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-bold uppercase text-slate-700 text-right tracking-wider"
                  >
                    Total Geral dos Custos:
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-right font-mono text-base font-extrabold text-amber-700">
                    {formatCurrencyBRL(calc.custoTotal)}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6" />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Cálculo da Precificação & Venda */}
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <PieChart className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                4. Cálculo da Precificação (Cálculo da Venda)
              </CardTitle>
            </div>
            <span className="text-xs text-slate-500 font-mono font-medium">
              Fórmula de Mark-up e Retenção
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          {/* Alerta de Denominador Inválido */}
          {!calc.isDenominadorValido && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-red-900 font-semibold">
                  Atenção: Os parâmetros de taxas precisam ser revisados!
                </strong>
                <span>
                  O Denominador de cálculo é menor ou igual a zero (
                  {calc.denominador.toFixed(4)}). Isso significa que a soma das taxas
                  sobre faturamento ({calc.somaTaxasFaturamentoPercent.toFixed(2)}%)
                  ultrapassou o Fator de retenção ({calc.fator.toFixed(4)}). Reduza as
                  alíquotas para viabilizar a precificação.
                </span>
              </div>
            </div>
          )}

          {/* Grid de passos do cálculo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 3.1 & 3.2: Lucro Desejado e Base */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700">
                  3.1 Lucro Desejado (R$)
                </span>
                <span className="text-[11px] text-amber-800 font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                  {params.margemLucroPercent}% sobre custo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Custo Total ({formatCurrencyBRL(calc.custoTotal)}) × {params.margemLucroPercent}%
              </p>
              <div className="text-lg font-bold text-amber-700 font-mono">
                {formatCurrencyBRL(calc.lucroDesejado)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700">
                  3.2 Base de Preço (R$)
                </span>
                <span className="text-[10px] text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded font-bold">
                  Custo + Lucro
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Valor para cobrir o custo e atingir a margem desejada antes das taxas.
              </p>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {formatCurrencyBRL(calc.base)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700">
                  4.1 Taxas sobre Faturamento
                </span>
                <span className="text-[10px] text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded font-bold">
                  Imposto + ISS + Antec.
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {params.impostoFaturamentoPercent}% + {params.issPercent}% + {params.antecipacaoPercent}%
              </p>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {calc.somaTaxasFaturamentoPercent.toFixed(2)}%
                <span className="text-xs font-normal text-slate-500 ml-1.5">
                  ({calc.somaTaxasFaturamentoDecimal.toFixed(4)})
                </span>
              </div>
            </div>
          </div>

          {/* Linha dos Fatores e Denominador */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">4.2 Fator</span>
                <span className="text-[10px] text-slate-500">
                  (1 - Taxa Adm) × (1 - Comissão)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                (1 - {(params.taxaAdministrativaPercent / 100).toFixed(2)}) × (1 - {(params.comissaoVendedorPercent / 100).toFixed(2)})
              </p>
              <div className="text-base font-bold text-slate-800 font-mono">
                {calc.fator.toFixed(4)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">4.3 Denominador</span>
                <span className="text-[10px] text-slate-500">
                  Fator - Taxas Faturamento
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {calc.fator.toFixed(4)} - {calc.somaTaxasFaturamentoDecimal.toFixed(4)}
              </p>
              <div
                className={`text-base font-bold font-mono ${
                  calc.isDenominadorValido ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {calc.denominador.toFixed(4)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border-2 border-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                  4.4 Valor Final da Venda
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded font-mono font-bold">
                  Base ÷ Denominador
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80">
                Valor que deverá ser faturado para garantir a Base desejada.
              </p>
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {formatCurrencyBRL(calc.valorFinalVenda)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Demonstrativo Financeiro (Resultado do Orçamento) */}
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <FileText className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                5. Resultado do Orçamento (Demonstrativo Financeiro)
              </CardTitle>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Discriminação de Deduções e Prova Real
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Imposto */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>Imposto ({params.impostoFaturamentoPercent}%)</span>
                <span className="text-[10px] text-slate-400">Faturamento</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatCurrencyBRL(calc.impostoValor)}
              </div>
            </div>

            {/* ISS */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>ISS ({params.issPercent}%)</span>
                <span className="text-[10px] text-slate-400">Faturamento</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatCurrencyBRL(calc.issValor)}
              </div>
            </div>

            {/* Antecipação */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>Antecipação ({params.antecipacaoPercent}%)</span>
                <span className="text-[10px] text-slate-400">Faturamento</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatCurrencyBRL(calc.antecipacaoValor)}
              </div>
            </div>

            {/* Taxa Administrativa */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>Taxa Adm. ({params.taxaAdministrativaPercent}%)</span>
                <span className="text-[10px] text-slate-400">Faturamento</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatCurrencyBRL(calc.taxaAdministrativaValor)}
              </div>
            </div>

            {/* Valor Recebido pela Empresa */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>Recebido pela Empresa</span>
                <span className="text-[10px] text-slate-400">Pós Taxa Adm</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatCurrencyBRL(calc.valorRecebidoEmpresa)}
              </div>
            </div>

            {/* Comissão do Vendedor */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>Comissão Vendedor ({params.comissaoVendedorPercent}%)</span>
                <span className="text-[10px] text-emerald-700 font-bold">Pós Taxa Adm</span>
              </div>
              <div className="text-base font-bold text-emerald-700 font-mono">
                {formatCurrencyBRL(calc.comissaoVendedorValor)}
              </div>
            </div>

            {/* Recebido após Comissão */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>Recebido após Comissão</span>
                <span className="text-[10px] text-blue-700 font-bold">Líquido</span>
              </div>
              <div className="text-base font-bold text-blue-700 font-mono">
                {formatCurrencyBRL(calc.recebidoAposComissao)}
              </div>
            </div>

            {/* Diferença */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                <span>Diferença (vs Base)</span>
                <span className="text-[10px] text-amber-700 font-bold">Recebido - Base</span>
              </div>
              <div className="text-base font-bold text-amber-800 font-mono">
                {formatCurrencyBRL(calc.diferenca)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Resumo Visual Final */}
      <div className="rounded-2xl bg-white border-2 border-amber-300 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              6. Resumo Final do Orçamento
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Atualizado em tempo real
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Custo Total
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-800 font-mono">
              {formatCurrencyBRL(calc.custoTotal)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Base Desejada
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-800 font-mono">
              {formatCurrencyBRL(calc.base)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Impostos & Taxas
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-700 font-mono">
              {formatCurrencyBRL(calc.impostosETaxasTotais)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">
              Comissão Vendedor
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono">
              {formatCurrencyBRL(calc.comissaoVendedorValor)}
            </span>
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1 bg-amber-50 p-3 rounded-xl border border-amber-300">
            <span className="text-[11px] font-bold text-amber-900 block uppercase">
              Valor Final Venda
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-amber-800 font-mono">
              {formatCurrencyBRL(calc.valorFinalVenda)}
            </span>
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1 bg-blue-50 p-3 rounded-xl border border-blue-200">
            <span className="text-[11px] font-bold text-blue-900 block uppercase">
              Recebido Empresa
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-blue-800 font-mono">
              {formatCurrencyBRL(calc.recebidoAposComissao)}
            </span>
          </div>
        </div>

        {/* Detalhamento do Valor Final de Venda de Cada Item Individual */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Valor Final de Venda de Cada Item Individual
            </h4>
            <span className="text-[11px] text-slate-500">
              Margem, impostos e taxas calculados proporcionalmente por item
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 sm:px-4">Item / Produto</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Quantidade</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">Custo Unitário</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">Custo Total</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">Preço Venda Unitário</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right font-bold text-amber-900 bg-amber-100/40">
                    Valor Final de Venda (R$)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">
                      Nenhum item cadastrado.
                    </td>
                  </tr>
                ) : (
                  itens.map((item, idx) => {
                    const itemCustoTotal = item.quantidade * item.custoUnitario;
                    const itemLucro =
                      itemCustoTotal * ((params.margemLucroPercent || 0) / 100);
                    const itemBase = itemCustoTotal + itemLucro;
                    const itemValorFinalVenda =
                      calc.isDenominadorValido &&
                      calc.denominador > 0 &&
                      calc.base > 0
                        ? itemBase / calc.denominador
                        : 0;
                    const itemVendaUnit =
                      item.quantidade > 0
                        ? itemValorFinalVenda / item.quantidade
                        : 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-900">
                          <span className="text-amber-700 font-mono font-bold mr-1.5">
                            #{idx + 1}
                          </span>
                          {item.produto}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center font-mono text-slate-700 font-semibold">
                          {item.quantidade}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-slate-600">
                          {formatCurrencyBRL(item.custoUnitario)}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-slate-700">
                          {formatCurrencyBRL(itemCustoTotal)}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-slate-800 font-medium">
                          {formatCurrencyBRL(itemVendaUnit)}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-mono font-extrabold text-amber-800 text-sm bg-amber-50/40">
                          {formatCurrencyBRL(itemValorFinalVenda)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                <tr>
                  <td
                    colSpan={3}
                    className="py-2.5 px-3 sm:px-4 uppercase text-[11px] text-slate-700"
                  >
                    Total Geral Consolidado:
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-slate-800">
                    {formatCurrencyBRL(calc.custoTotal)}
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 text-right text-slate-400 font-normal">
                    —
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-base font-extrabold text-amber-900 bg-amber-100/60">
                    {formatCurrencyBRL(calc.valorFinalVenda)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Diferença em relação à Base:{' '}
              <strong className="text-slate-900 font-mono font-bold">
                {formatCurrencyBRL(calc.diferenca)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveOrcamento}
              leftIcon={<Save className="w-4 h-4" />}
              className="flex-1 sm:flex-none"
            >
              Salvar Orçamento
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Adicionar / Editar Item */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Editar Item do Orçamento' : 'Adicionar Item ao Orçamento'}
        description="Informe o produto/serviço, quantidade e custo unitário."
        maxWidth="md"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {itemError && (
            <Alert type="error" onClose={() => setItemError('')}>
              {itemError}
            </Alert>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Item / Produto / Serviço *
            </label>
            <input
              type="text"
              value={itemProduto}
              onChange={(e) => setItemProduto(e.target.value)}
              placeholder="Ex: Retífica de Cabeçote, Jogo de Bielas..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantidade *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={itemQuantidade}
                onChange={(e) => setItemQuantidade(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Custo Unitário (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemCustoUnitario}
                onChange={(e) => setItemCustoUnitario(e.target.value)}
                placeholder="Ex: 450,00"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                required
              />
            </div>
          </div>

          {/* Prévia de Custo Total do Item */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Custo Total deste Item (Qtd × Unitário):
            </span>
            <span className="font-mono font-bold text-amber-700 text-sm">
              {formatCurrencyBRL(
                (parseFloat(itemQuantidade) || 0) * (parseFloat(itemCustoUnitario) || 0)
              )}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsItemModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingItem ? 'Atualizar Item' : 'Adicionar Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão de Item */}
      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Excluir Item"
        description="Confirmar a exclusão do item."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Deseja realmente excluir o item{' '}
            <strong className="text-slate-900">
              {deletingItem?.produto}
            </strong>
            ? Esta ação é irreversível.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingItem(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDeleteItem}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
