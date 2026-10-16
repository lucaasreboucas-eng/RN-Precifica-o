import React, { useRef, useEffect } from 'react';
import { Printer, Download, X, FileText, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface OrcamentoPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  filename: string;
  osNumber?: string;
  clientName?: string;
}

export const OrcamentoPdfModal: React.FC<OrcamentoPdfModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  filename,
  osNumber,
  clientName,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Esc key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl) return null;

  const handlePrint = () => {
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    } catch {
      // If cross-origin or iframe print fails, fallback to download/direct open
    }

    // Direct fallback
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.click();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200">
        {/* Header da Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Resumo Final do Orçamento
                </h3>
                {osNumber && (
                  <span className="text-[11px] font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                    {osNumber}
                  </span>
                )}
              </div>
              {clientName && (
                <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                  Cliente: <span className="text-slate-200 font-medium">{clientName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
              className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm"
              title="Imprimir Resumo do Orçamento"
            >
              Imprimir
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="w-4 h-4" />}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              title="Baixar arquivo PDF"
            >
              Baixar PDF
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Fechar visualizador"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visualizador do PDF */}
        <div className="flex-1 bg-slate-100 p-1 sm:p-2 overflow-hidden flex flex-col min-h-[500px]">
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title={`Resumo do Orçamento ${osNumber || ''}`}
            className="w-full h-full min-h-[520px] rounded-lg border border-slate-300 shadow-inner bg-white"
          />
        </div>

        {/* Rodapé informativo */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            PDF gerado exclusivamente com a parte do Resumo Final do Orçamento.
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {filename}
          </span>
        </div>
      </div>
    </div>
  );
};
