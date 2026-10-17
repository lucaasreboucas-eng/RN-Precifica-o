import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Orcamento } from '../types/orcamento';
import { calculatePricing, formatCurrencyBRL } from './pricingEngine';

export interface GeneratedPdfResult {
  doc: jsPDF;
  blob: Blob;
  url: string;
  filename: string;
}

/**
 * Generates a professional PDF containing exclusively the "Resumo Final do Orçamento".
 */
export function generateResumoOrcamentoPdf(orcamento: Orcamento): GeneratedPdfResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const calc = calculatePricing(orcamento.itens || [], orcamento.parametros);

  // 1. Header Background & Brand Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Accent Line (Amber)
  doc.setFillColor(217, 119, 6); // Amber-600
  doc.rect(0, 26, pageWidth, 2, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RN PRECIFICAÇÃO', 14, 13);

  // Subtitle / Document Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // Amber-500
  doc.text('RESUMO FINAL DO ORÇAMENTO', 14, 20);

  // OS Badge (Right Side)
  const osText = orcamento.osNumber || 'OS-SEM-NUMERO';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(osText, pageWidth - 14, 16, { align: 'right' });

  let currentY = 36;

  // 2. Dados do Orçamento (Orçamento Header Information)
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('CLIENTE:', 18, currentY + 7);
  doc.text('RESPONSÁVEL:', 18, currentY + 14);
  doc.text('DATA DO ORÇAMENTO:', 18, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(orcamento.clientName || 'Cliente não informado', 56, currentY + 7);
  doc.text(orcamento.responsavel || 'Não informado', 56, currentY + 14);

  // Format Date (YYYY-MM-DD to DD/MM/YYYY if applicable)
  let formattedDate = orcamento.date || '';
  if (formattedDate.includes('-')) {
    const parts = formattedDate.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  doc.text(formattedDate || new Date().toLocaleDateString('pt-BR'), 56, currentY + 20);

  // Status Badge on the right
  if (calc.temDesconto) {
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(16, 185, 129); // Emerald-500
    doc.roundedRect(pageWidth - 62, currentY + 3, 48, 18, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87); // Emerald-700
    doc.text(`VALOR FINAL C/ DESC. (${calc.descontoPercent}%)`, pageWidth - 38, currentY + 8, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70); // Emerald-800
    doc.text(formatCurrencyBRL(calc.valorFinalVendaComDesconto), pageWidth - 38, currentY + 14, {
      align: 'center',
    });
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Original: ${formatCurrencyBRL(calc.valorFinalVenda)}`, pageWidth - 38, currentY + 19, {
      align: 'center',
    });
  } else {
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11); // Amber-500
    doc.roundedRect(pageWidth - 55, currentY + 5, 41, 14, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('VALOR FINAL VENDA', pageWidth - 34.5, currentY + 10, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14); // Amber-800
    doc.text(formatCurrencyBRL(calc.valorFinalVenda), pageWidth - 34.5, currentY + 16, {
      align: 'center',
    });
  }

  currentY += 30;

  // 3. Indicadores Financeiros do Resumo Final
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONSOLIDAÇÃO FINANCEIRA DO ORÇAMENTO', 14, currentY);

  currentY += 4;

  const resumoRows: any[] = [
    [
      { content: 'Custo Total dos Itens', styles: { fontStyle: 'bold' } },
      { content: formatCurrencyBRL(calc.custoTotal), styles: { halign: 'right' } },
      { content: 'Base Desejada (Custo + Lucro)', styles: { fontStyle: 'bold' } },
      { content: formatCurrencyBRL(calc.base), styles: { halign: 'right' } },
    ],
    [
      { content: 'Impostos e Taxas sobre Venda', styles: { fontStyle: 'bold' } },
      { content: formatCurrencyBRL(calc.impostosETaxasTotais), styles: { halign: 'right' } },
      {
        content: calc.temDesconto
          ? `Comissão Vendedor (${orcamento.parametros?.comissaoVendedorPercent || 0}% s/ Venda c/ Desc.)`
          : `Comissão Vendedor (${orcamento.parametros?.comissaoVendedorPercent || 0}%)`,
        styles: { fontStyle: 'bold' },
      },
      { content: formatCurrencyBRL(calc.comissaoVendedorValor), styles: { halign: 'right', textColor: [4, 120, 87] } },
    ],
    [
      { content: 'VALOR FINAL DE VENDA (FATURADO)', styles: { fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [146, 64, 14] } },
      { content: formatCurrencyBRL(calc.valorFinalVenda), styles: { halign: 'right', fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [146, 64, 14] } },
      { content: 'VALOR RECEBIDO PELA EMPRESA', styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
      { content: formatCurrencyBRL(calc.recebidoAposComissao), styles: { halign: 'right', fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
    ],
  ];

  if (calc.temDesconto) {
    resumoRows.push([
      {
        content: `DESCONTO CONCEDIDO (${calc.descontoPercent}%)`,
        styles: { fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [185, 28, 28] },
      },
      {
        content: `-${formatCurrencyBRL(calc.valorDesconto)}`,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [185, 28, 28] },
      },
      {
        content: 'VALOR FINAL DA VENDA COM DESCONTO',
        styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] },
      },
      {
        content: formatCurrencyBRL(calc.valorFinalVendaComDesconto),
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] },
      },
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    body: resumoRows as any,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 36 },
      2: { cellWidth: 55 },
      3: { cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 9;

  // 4. Detalhamento dos Itens do Orçamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. VALOR FINAL DE VENDA DE CADA ITEM INDIVIDUAL', 14, currentY);

  currentY += 4;

  const itens = orcamento.itens || [];
  const tableData = itens.map((item, idx) => {
    const itemCustoTotal = item.quantidade * item.custoUnitario;
    const itemLucro = itemCustoTotal * ((orcamento.parametros?.margemLucroPercent || 0) / 100);
    const itemBase = itemCustoTotal + itemLucro;
    const itemValorFinalVenda =
      calc.isDenominadorValido && calc.denominador > 0 && calc.base > 0
        ? itemBase / calc.denominador
        : 0;
    const itemVendaUnit =
      item.quantidade > 0 ? itemValorFinalVenda / item.quantidade : 0;

    return [
      `#${idx + 1} ${item.produto}`,
      String(item.quantidade),
      formatCurrencyBRL(item.custoUnitario),
      formatCurrencyBRL(itemCustoTotal),
      formatCurrencyBRL(itemVendaUnit),
      formatCurrencyBRL(itemValorFinalVenda),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Item / Produto',
        'Qtd',
        'Custo Unit.',
        'Custo Total',
        'Venda Unit.',
        'Valor Final Venda (R$)',
      ],
    ],
    body: tableData,
    foot: [
      [
        { content: 'TOTAL GERAL CONSOLIDADO:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatCurrencyBRL(calc.custoTotal), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: '—', styles: { halign: 'center' } },
        {
          content: calc.temDesconto
            ? `${formatCurrencyBRL(calc.valorFinalVenda)} (Orig.)\n${formatCurrencyBRL(calc.valorFinalVendaComDesconto)} (c/ Desc.)`
            : formatCurrencyBRL(calc.valorFinalVenda),
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fillColor: calc.temDesconto ? [236, 253, 245] : [254, 243, 199],
            textColor: calc.temDesconto ? [4, 120, 87] : [146, 64, 14],
          },
        },
      ],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 29, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer on every page
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // Slate-400
      const footerText = `RN Precificação • ${orcamento.osNumber} • Documento gerado em ${new Date().toLocaleString('pt-BR')}`;
      doc.text(footerText, 14, pageHeight - 8);

      const pageStr = `Página ${data.pageNumber}`;
      doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const cleanOs = (orcamento.osNumber || 'orcamento').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `Resumo_${cleanOs}.pdf`;

  return {
    doc,
    blob,
    url,
    filename,
  };
}
