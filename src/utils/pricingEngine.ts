import type {
  PricingParameters,
  OrcamentoItem,
  CalculatedItem,
  PricingCalculations,
} from '../types/orcamento';

/**
 * Calculates item-level pricing:
 * Custo Total = Quantidade × Custo Unitário
 * Lucro Desejado = Custo Total × Margem de Lucro (%)
 * Base = Custo Total + Lucro Desejado
 */
export function calculateItem(
  item: OrcamentoItem,
  margemLucroPercent: number
): CalculatedItem {
  const quantidade = Number(item.quantidade) || 0;
  const custoUnitario = Number(item.custoUnitario) || 0;
  const custoTotal = quantidade * custoUnitario;
  const margemDecimal = (Number(margemLucroPercent) || 0) / 100;
  const lucroDesejado = custoTotal * margemDecimal;
  const base = custoTotal + lucroDesejado;

  return {
    ...item,
    custoTotal,
    lucroDesejado,
    base,
  };
}

/**
 * Central calculation engine implementing the exact formulas specified:
 *
 * 1. Custo Total = Soma de todos os custos dos itens
 * 2. Lucro Desejado = Custo Total × Margem de Lucro (%)
 * 3. Base = Custo Total + Lucro Desejado
 * 4. Somatório das Taxas sobre Faturamento (%) = Imposto + ISS + Antecipação
 * 5. Fator = (1 - Taxa Administrativa) × (1 - Comissão do Vendedor)
 * 6. Denominador = Fator - Somatório das Taxas sobre Faturamento
 * 7. Valor Final da Venda (Faturado) = Base ÷ Denominador
 * 8. Valor Recebido pela Empresa = Valor Final da Venda × (1 - Taxa Administrativa)
 * 9. Demonstrativo Financeiro:
 *    - Imposto = Valor Final da Venda × Imposto sobre Faturamento (%)
 *    - ISS = Valor Final da Venda × ISS (%)
 *    - Antecipação = Valor Final da Venda × Antecipação (%)
 *    - Taxa Administrativa = Valor Final da Venda × Taxa Administrativa (%)
 *    - Comissão = Valor Recebido pela Empresa × Comissão do Vendedor (%)
 *    - Recebido após Comissão = Valor Recebido pela Empresa - Comissão
 *    - Diferença = Recebido pela Empresa após Comissão - Base
 */
export function calculatePricing(
  itens: OrcamentoItem[],
  params: PricingParameters
): PricingCalculations {
  const margemPercent = Number(params.margemLucroPercent) || 0;
  const impostoPercent = Number(params.impostoFaturamentoPercent) || 0;
  const taxaAdminPercent = Number(params.taxaAdministrativaPercent) || 0;
  const comissaoPercent = Number(params.comissaoVendedorPercent) || 0;
  const issPercent = Number(params.issPercent) || 0;
  const antecipacaoPercent = Number(params.antecipacaoPercent) || 0;

  // Calculate totals across items
  let custoTotal = 0;
  for (const item of itens) {
    const qty = Number(item.quantidade) || 0;
    const unitCost = Number(item.custoUnitario) || 0;
    custoTotal += qty * unitCost;
  }

  const lucroDesejado = custoTotal * (margemPercent / 100);
  const base = custoTotal + lucroDesejado;

  // 4.1 Somatório das Taxas sobre Faturamento (%) = Imposto + ISS + Antecipação
  const somaTaxasFaturamentoPercent = impostoPercent + issPercent + antecipacaoPercent;
  const somaTaxasFaturamentoDecimal = somaTaxasFaturamentoPercent / 100;

  // 4.2 Fator = (1 - Taxa Administrativa) × (1 - Comissão do Vendedor)
  const taxaAdminDecimal = taxaAdminPercent / 100;
  const comissaoDecimal = comissaoPercent / 100;
  const fator = (1 - taxaAdminDecimal) * (1 - comissaoDecimal);

  // 4.3 Denominador = Fator - Somatório das Taxas sobre Faturamento
  const denominador = fator - somaTaxasFaturamentoDecimal;
  const isDenominadorValido = denominador > 0;

  // 4.4 Valor Final da Venda (Faturado) = Base ÷ Denominador
  let valorFinalVenda = 0;
  if (isDenominadorValido && base > 0) {
    valorFinalVenda = base / denominador;
  }

  // Valor Recebido pela Empresa = Valor Final da Venda × (1 - Taxa Administrativa)
  const valorRecebidoEmpresa = valorFinalVenda * (1 - taxaAdminDecimal);

  // Demonstrativo Financeiro
  const impostoValor = valorFinalVenda * (impostoPercent / 100);
  const issValor = valorFinalVenda * (issPercent / 100);
  const antecipacaoValor = valorFinalVenda * (antecipacaoPercent / 100);
  const taxaAdministrativaValor = valorFinalVenda * taxaAdminDecimal;
  const impostosETaxasTotais =
    impostoValor + issValor + antecipacaoValor + taxaAdministrativaValor;

  const comissaoVendedorValor = valorRecebidoEmpresa * comissaoDecimal;
  const recebidoAposComissao = valorRecebidoEmpresa - comissaoVendedorValor;

  // Diferença = Recebido pela Empresa após Comissão - Base
  const diferenca = base > 0 ? recebidoAposComissao - base : 0;

  return {
    custoTotal,
    lucroDesejado,
    base,
    somaTaxasFaturamentoPercent,
    somaTaxasFaturamentoDecimal,
    fator,
    denominador,
    isDenominadorValido,
    valorFinalVenda,
    valorRecebidoEmpresa,
    impostoValor,
    issValor,
    antecipacaoValor,
    taxaAdministrativaValor,
    impostosETaxasTotais,
    comissaoVendedorValor,
    recebidoAposComissao,
    diferenca,
  };
}

export function formatCurrencyBRL(val: number): string {
  if (isNaN(val) || !isFinite(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatPercentBR(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '0%';
  return `${Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}
