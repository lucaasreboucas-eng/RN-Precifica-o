export interface PricingParameters {
  margemLucroPercent: number; // %
  impostoFaturamentoPercent: number; // %
  taxaAdministrativaPercent: number; // %
  comissaoVendedorPercent: number; // %
  issPercent: number; // %
  antecipacaoPercent: number; // %
}

export interface OrcamentoItem {
  id: string;
  produto: string;
  descricao: string;
  quantidade: number;
  custoUnitario: number;
}

export interface CalculatedItem extends OrcamentoItem {
  custoTotal: number;
  lucroDesejado: number;
  base: number;
}

export interface PricingCalculations {
  custoTotal: number;
  lucroDesejado: number;
  base: number;
  somaTaxasFaturamentoPercent: number;
  somaTaxasFaturamentoDecimal: number;
  fator: number;
  denominador: number;
  isDenominadorValido: boolean;
  valorFinalVenda: number;
  valorRecebidoEmpresa: number;
  // Demonstrativo Financeiro
  impostoValor: number;
  issValor: number;
  antecipacaoValor: number;
  taxaAdministrativaValor: number;
  impostosETaxasTotais: number;
  comissaoVendedorValor: number;
  recebidoAposComissao: number;
  diferenca: number;
}

export interface Orcamento {
  id: string;
  osNumber: string;
  clientName: string;
  date: string;
  responsavel: string;
  createdByEmail?: string;
  createdByUserId?: string;
  status: 'Pendente' | 'Em Análise' | 'Aprovado' | 'Recusado';
  parametros: PricingParameters;
  itens: OrcamentoItem[];
  totalValue: number; // Valor Final da Venda (Faturado)
  custoTotal?: number;
  base?: number;
}
