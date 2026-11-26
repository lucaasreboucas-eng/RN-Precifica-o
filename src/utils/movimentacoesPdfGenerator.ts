import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Movimentacao } from '../types/estoque';

export interface GeneratedMovimentacoesPdfResult {
  doc: jsPDF;
  blob: Blob;
  url: string;
  filename: string;
}

export interface RelatorioMovimentacoesFilters {
  dataInicio?: string;
  dataFinal?: string;
  placa?: string;
  responsavel?: string;
}

const formatDateTimeBR = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || 'Não informado';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso || 'Não informado';
  }
};

const formatDateOnlyYMDToBR = (ymd?: string): string => {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return ymd;
};

const getPeriodoLabel = (filters?: RelatorioMovimentacoesFilters): string | null => {
  const ini = formatDateOnlyYMDToBR(filters?.dataInicio);
  const fim = formatDateOnlyYMDToBR(filters?.dataFinal);

  if (ini && fim) return `De ${ini} até ${fim}`;
  if (ini) return `A partir de ${ini}`;
  if (fim) return `Até ${fim}`;
  return null;
};

/**
 * Generates a consolidated PDF report of selected stock movements,
 * reusing the exact visual standard of orcamentoPdfGenerator.ts.
 */
export function generateRelatorioMovimentacoesPdf(
  movimentacoes: Movimentacao[],
  filters?: RelatorioMovimentacoesFilters
): GeneratedMovimentacoesPdfResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const emissaoStr = new Date().toLocaleString('pt-BR');
  const periodoLabel = getPeriodoLabel(filters);

  // 1. Header Background & Brand Banner (Mesmo modelo visual de orcamentoPdfGenerator)
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Accent Line (Amber)
  doc.setFillColor(217, 119, 6); // Amber-600
  doc.rect(0, 26, pageWidth, 2, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RN MANUTENÇÃO DE FROTA', 14, 13);

  // Subtitle / Document Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // Amber-500
  doc.text('RELATÓRIO DE MOVIMENTAÇÕES DE ESTOQUE', 14, 20);

  // Right Badge in Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const badgeText =
    movimentacoes.length === 1
      ? '1 MOVIMENTAÇÃO'
      : `${movimentacoes.length} MOVIMENTAÇÕES`;
  doc.text(badgeText, pageWidth - 14, 16, { align: 'right' });

  let currentY = 35;

  // 2. Bloco de Metadados do Relatório
  const hasFiltersInfo = Boolean(
    periodoLabel || filters?.placa?.trim() || filters?.responsavel?.trim()
  );
  const infoBoxHeight = hasFiltersInfo ? 26 : 19;

  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, currentY, pageWidth - 28, infoBoxHeight, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('DATA/HORA DE EMISSÃO:', 18, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(emissaoStr, 62, currentY + 7);

  if (periodoLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PERÍODO CONSULTADO:', 18, currentY + 14);
    doc.setTextColor(15, 23, 42);
    doc.text(periodoLabel, 62, currentY + 14);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PERÍODO CONSULTADO:', 18, currentY + 14);
    doc.setTextColor(15, 23, 42);
    doc.text('Todas as datas', 62, currentY + 14);
  }

  if (filters?.placa?.trim() || filters?.responsavel?.trim()) {
    const activeExtraFilters: string[] = [];
    if (filters?.placa?.trim()) {
      activeExtraFilters.push(`Placa: ${filters.placa.trim().toUpperCase()}`);
    }
    if (filters?.responsavel?.trim()) {
      activeExtraFilters.push(`Responsável: ${filters.responsavel.trim()}`);
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('FILTROS APLICADOS:', 18, currentY + 21);
    doc.setTextColor(15, 23, 42);
    doc.text(activeExtraFilters.join('  |  '), 62, currentY + 21);
  }

  // Highlight badge on the right (Amber-100 / Amber-500)
  const totalPecasGeral = movimentacoes.reduce(
    (sum, m) =>
      sum + (m.itens || []).reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0),
    0
  );

  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(245, 158, 11); // Amber-500
  const badgeBoxY = currentY + (infoBoxHeight - 14) / 2;
  doc.roundedRect(pageWidth - 58, badgeBoxY, 40, 14, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text('TOTAL DE PEÇAS', pageWidth - 38, badgeBoxY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14); // Amber-800
  doc.text(String(totalPecasGeral), pageWidth - 38, badgeBoxY + 11, { align: 'center' });

  currentY += infoBoxHeight + 8;

  // 3. Listagem Sequencial das Movimentações Selecionadas
  movimentacoes.forEach((mov, idx) => {
    // Garante espaço mínimo para o cabeçalho da movimentação + tabela inicial sem quebrar órfão
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 18;
    }

    // Título sequencial da movimentação
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(
      `MOVIMENTAÇÃO #${idx + 1} — ${formatDateTimeBR(mov.dataHora)}`,
      14,
      currentY
    );

    currentY += 3;

    // Tabela de identificação (Data/Hora, Placa, Modelo, Responsável)
    autoTable(doc, {
      startY: currentY,
      body: [
        [
          { content: 'Data e Hora', styles: { fontStyle: 'bold', textColor: [100, 116, 139], fillColor: [248, 250, 252] } },
          { content: formatDateTimeBR(mov.dataHora), styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: 'Placa do Veículo', styles: { fontStyle: 'bold', textColor: [100, 116, 139], fillColor: [248, 250, 252] } },
          { content: mov.placaVeiculo || 'Não informada', styles: { fontStyle: 'bold', textColor: [180, 83, 9] } },
        ],
        [
          { content: 'Modelo do Veículo', styles: { fontStyle: 'bold', textColor: [100, 116, 139], fillColor: [248, 250, 252] } },
          { content: mov.modeloVeiculo || 'Não informado', styles: { textColor: [15, 23, 42] } },
          { content: 'Responsável', styles: { fontStyle: 'bold', textColor: [100, 116, 139], fillColor: [248, 250, 252] } },
          { content: mov.responsavel || 'Não informado', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        ],
      ] as any,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        font: 'helvetica',
      },
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 57 },
        2: { cellWidth: 34 },
        3: { cellWidth: 57 },
      },
      margin: { left: 14, right: 14, bottom: 16, top: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 1.5;

    // Tabela dos produtos movimentados nesta movimentação
    const itens = Array.isArray(mov.itens) ? mov.itens : [];
    const totalQtdMov = itens.reduce((sum, it) => sum + (Number(it.quantidade) || 0), 0);
    const productRows = itens.map((it) => [
      it.codigo || '—',
      it.descricao || '—',
      String(it.quantidade ?? 0),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Código do Produto', 'Descrição do Produto', 'Quantidade Retirada']],
      body: productRows.length > 0 ? productRows : [['—', 'Nenhum produto registrado', '0']],
      foot: [
        [
          {
            content: `Itens na movimentação: ${itens.length}`,
            styles: { halign: 'left', fontStyle: 'bold' },
          },
          {
            content: 'TOTAL DE PEÇAS RETIRADAS:',
            styles: { halign: 'right', fontStyle: 'bold' },
          },
          {
            content: String(totalQtdMov),
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fillColor: [254, 243, 199],
              textColor: [146, 64, 14],
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
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 112 },
        2: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14, bottom: 16, top: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 9;
  });

  // 4. Rodapé padronizado em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate-400
    const footerText = `RN Manutenção de Frota • Relatório de Movimentações de Estoque • Emitido em ${emissaoStr}`;
    doc.text(footerText, 14, pageHeight - 8);

    const pageStr =
      totalPages > 1 ? `Página ${p} de ${totalPages}` : `Página ${p}`;
    doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename =
    movimentacoes.length === 1
      ? `Movimentacao_${(movimentacoes[0].placaVeiculo || 'registro').replace(/[^a-zA-Z0-9-_]/g, '_')}_${dateSlug}.pdf`
      : `Relatorio_Movimentacoes_${dateSlug}.pdf`;

  return {
    doc,
    blob,
    url,
    filename,
  };
}
