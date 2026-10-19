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

  const temDesconto = Boolean(params.temDesconto);
  const descontoPercent = temDesconto ? Math.max(0, Number(params.descontoPercent) || 0) : 0;

  // Encargos Totais (%) sobre a NOTA:
  // Imposto sobre faturamento (%) + ISS sobre faturamento (%) + Antecipação sobre faturamento (%) + Taxa Administrativa (%) + Comissão Vendedor (%) - sobre NOTA
  const encargosTotaisNotaPercent =
    impostoPercent + issPercent + antecipacaoPercent + taxaAdminPercent + comissaoPercent;
  const encargosTotaisNotaDecimal = encargosTotaisNotaPercent / 100;

  // Validação: se os encargos totais forem iguais ou superiores a 100%, o sistema deverá impedir o cálculo e exibir uma mensagem de erro
  const isEncargosValido = encargosTotaisNotaPercent < 100;
  const encargosErrorMessage = !isEncargosValido
    ? `Os Encargos Totais sobre a NOTA são iguais ou superiores a 100% (${encargosTotaisNotaPercent.toFixed(2)}%). O cálculo não pode ser realizado. Reduza as taxas para prosseguir.`
    : undefined;

  // =========================================================================
  // REGRA EXCLUSIVA: QUANDO "CLIENTE COM DESCONTO" ESTIVER MARCADO COMO "SIM"
  // =========================================================================
  if (temDesconto) {
    const dDecimal = descontoPercent / 100;
    const isDescontoValido = dDecimal < 1;

    // Se encargos totais >= 100% ou desconto inválido ou base zero: impede cálculo
    if (!isEncargosValido || !isDescontoValido || base <= 0) {
      const somaTaxasFaturamentoPercent = impostoPercent + issPercent + antecipacaoPercent;
      const somaTaxasFaturamentoDecimal = somaTaxasFaturamentoPercent / 100;
      const fator = (1 - taxaAdminPercent / 100) * (1 - comissaoPercent / 100);
      const denominador = 1 - encargosTotaisNotaDecimal;

      return {
        custoTotal,
        lucroDesejado,
        base,
        somaTaxasFaturamentoPercent,
        somaTaxasFaturamentoDecimal,
        fator,
        denominador,
        isDenominadorValido: isEncargosValido && isDescontoValido,
        valorFinalVenda: 0,
        valorRecebidoEmpresa: 0,
        temDesconto: true,
        descontoPercent,
        valorDesconto: 0,
        valorFinalVendaComDesconto: 0,
        encargosTotaisNotaPercent,
        encargosTotaisNotaDecimal,
        isEncargosValido,
        encargosErrorMessage,
        impostoValor: 0,
        issValor: 0,
        antecipacaoValor: 0,
        taxaAdministrativaValor: 0,
        impostosETaxasTotais: 0,
        comissaoVendedorValor: 0,
        recebidoAposComissao: 0,
        diferenca: 0,
      };
    }

    // 1. Preço Final com Desconto (o valor cobrado/faturado na NOTA que preserva exatamente o lucro desejado em reais):
    //    Preço Final = Base ÷ (1 - Encargos Totais sobre a NOTA)
    const denominadorComDesconto = 1 - encargosTotaisNotaDecimal;
    const valorFinalVendaComDesconto = base / denominadorComDesconto;

    // 2. Preço de Venda (antes do desconto, preço cheio/tabela):
    //    Preço de Venda = Preço Final ÷ (1 - Desconto Concedido ao Cliente)
    const valorFinalVenda =
      dDecimal > 0 ? valorFinalVendaComDesconto / (1 - dDecimal) : valorFinalVendaComDesconto;

    // 3. Desconto concedido ao cliente em R$:
    const valorDesconto = valorFinalVenda - valorFinalVendaComDesconto;

    // 4. Encargos incidentes sobre a NOTA (faturamento efetivo = valorFinalVendaComDesconto):
    const impostoValor = valorFinalVendaComDesconto * (impostoPercent / 100);
    const issValor = valorFinalVendaComDesconto * (issPercent / 100);
    const antecipacaoValor = valorFinalVendaComDesconto * (antecipacaoPercent / 100);
    const taxaAdministrativaValor = valorFinalVendaComDesconto * (taxaAdminPercent / 100);
    const comissaoVendedorValor = valorFinalVendaComDesconto * (comissaoPercent / 100);

    const impostosETaxasTotais =
      impostoValor + issValor + antecipacaoValor + taxaAdministrativaValor;
    const totalEncargosNota = impostosETaxasTotais + comissaoVendedorValor;

    // Valor recebido pela empresa pós taxa administrativa:
    const valorRecebidoEmpresa = valorFinalVendaComDesconto - taxaAdministrativaValor;

    // Recebido após comissão e todos os encargos sobre a nota:
    const recebidoAposComissao = valorFinalVendaComDesconto - totalEncargosNota;

    // Diferença = Recebido - Base (será exatamente 0, comprovando preservação do lucro desejado)
    const diferenca = recebidoAposComissao - base;

    return {
      custoTotal,
      lucroDesejado,
      base,
      somaTaxasFaturamentoPercent: impostoPercent + issPercent + antecipacaoPercent,
      somaTaxasFaturamentoDecimal: (impostoPercent + issPercent + antecipacaoPercent) / 100,
      fator: (1 - taxaAdminPercent / 100) * (1 - comissaoPercent / 100),
      denominador: denominadorComDesconto,
      isDenominadorValido: true,
      valorFinalVenda,
      valorRecebidoEmpresa,
      temDesconto: true,
      descontoPercent,
      valorDesconto,
      valorFinalVendaComDesconto,
      encargosTotaisNotaPercent,
      encargosTotaisNotaDecimal,
      isEncargosValido: true,
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

  // =========================================================================
  // REGRA ORIGINAL QUANDO "CLIENTE COM DESCONTO" FOR "NÃO" (PRESERVADA INTEGRALMENTE)
  // =========================================================================
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
    temDesconto: false,
    descontoPercent: 0,
    valorDesconto: 0,
    valorFinalVendaComDesconto: valorFinalVenda,
    encargosTotaisNotaPercent,
    encargosTotaisNotaDecimal,
    isEncargosValido: true,
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
