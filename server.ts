import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { extractText } from 'unpdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

function parseBrazilianNumber(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const cleaned = String(raw)
    .replace(/[R$\s]/g, '')
    .trim();
  if (!cleaned) return 0;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function fallbackParseText(text: string): Array<{ codigoDescricao: string; qte: number }> {
  const results: Array<{ codigoDescricao: string; qte: number }> = [];
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const ignoreRegex =
    /^(?:c[oó]digo|item\s+c[oó]digo|subtotal|total\s+geral|valor\s+total|desconto|frete|cnpj|cpf|insc\.?\s*est|endere[cç]o|telefone|cliente|vendedor|condi[cç][aã]o|observa[cç][aã]o|p[aá]gina|data\s+de\s+emiss[aã]o|validade|or[cç]amento\s+n|cota[cç][aã]o\s+n)/i;

  for (const line of rawLines) {
    if (ignoreRegex.test(line)) continue;
    if (/c[oó]digo.*descri[cç][aã]o/i.test(line)) continue;

    // Look for decimal numbers formatted with comma (e.g. 2,00  145,50  291,00)
    const currencyMatches = [
      ...line.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2,4}\b/g),
    ];

    if (currencyMatches.length === 0) continue;

    let qte = 1;
    let cutIndex = currencyMatches[0].index ?? line.length;

    if (currencyMatches.length >= 3) {
      // Format: [Código Descrição] [Qte: 2,00] [Vl. Un: 145,50] [Vl. Total: 291,00]
      const n1 = parseBrazilianNumber(currencyMatches[currencyMatches.length - 3][0]);
      const n2 = parseBrazilianNumber(currencyMatches[currencyMatches.length - 2][0]);
      const n3 = parseBrazilianNumber(currencyMatches[currencyMatches.length - 1][0]);
      if (n1 > 0 && n2 > 0 && Math.abs(n1 * n2 - n3) <= Math.max(0.1, n3 * 0.02)) {
        qte = n1;
        cutIndex = currencyMatches[currencyMatches.length - 3].index ?? cutIndex;
      } else {
        // Check if there is an integer Qte. right before the currency numbers
        const prefix = line.slice(0, currencyMatches[currencyMatches.length - 2].index).trim();
        const intQtyMatch = prefix.match(/\b(\d+)\s*(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)?$/i);
        if (intQtyMatch) {
          qte = parseInt(intQtyMatch[1], 10) || 1;
          cutIndex =
            (currencyMatches[currencyMatches.length - 2].index ?? 0) - intQtyMatch[0].length;
        } else {
          qte = n1 > 0 ? n1 : 1;
          cutIndex = currencyMatches[currencyMatches.length - 3].index ?? cutIndex;
        }
      }
    } else if (currencyMatches.length === 2) {
      const n1 = parseBrazilianNumber(currencyMatches[0][0]);
      const n2 = parseBrazilianNumber(currencyMatches[1][0]);
      const prefix = line.slice(0, currencyMatches[0].index).trim();
      const intQtyMatch = prefix.match(/\b(\d+)\s*(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)?$/i);
      if (intQtyMatch) {
        qte = parseInt(intQtyMatch[1], 10) || 1;
        cutIndex = (currencyMatches[0].index ?? 0) - intQtyMatch[0].length;
      } else {
        qte = n1 > 0 ? n1 : 1;
        cutIndex = currencyMatches[0].index ?? cutIndex;
      }
    } else if (currencyMatches.length === 1) {
      const prefix = line.slice(0, currencyMatches[0].index).trim();
      const intQtyMatch = prefix.match(/\b(\d+)\s*(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)?$/i);
      if (intQtyMatch) {
        qte = parseInt(intQtyMatch[1], 10) || 1;
        cutIndex = (currencyMatches[0].index ?? 0) - intQtyMatch[0].length;
      } else {
        qte = parseBrazilianNumber(currencyMatches[0][0]) || 1;
        cutIndex = currencyMatches[0].index ?? cutIndex;
      }
    }

    const descPart = line
      .slice(0, cutIndex)
      .replace(/\s+\d+\s*(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)?\s*$/i, '')
      .replace(/\s+(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)\s*$/i, '')
      .trim();

    if (descPart && /[A-Za-zÀ-ÿ]{2,}/.test(descPart) && qte > 0) {
      results.push({
        codigoDescricao: descPart,
        qte,
      });
    }
  }

  return results;
}

async function generateWithFallback(parts: any[]) {
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                itens: {
                  type: Type.ARRAY,
                  description: 'Itens extraídos do documento de cotação.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      codigoDescricao: {
                        type: Type.STRING,
                        description: 'Campo Código Descrição da Peça.',
                      },
                      qte: {
                        type: Type.NUMBER,
                        description: 'Valor numérico do campo Qte. (quantidade) do relatório.',
                      },
                    },
                    required: ['codigoDescricao', 'qte'],
                  },
                },
              },
              required: ['itens'],
            },
          },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || err?.error?.code;
        const msg = String(err?.message || '');
        const isTransient =
          status === 503 ||
          status === 429 ||
          status === 500 ||
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('429');

        if (isTransient) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post('/api/parse-cotacao', async (req, res) => {
    let extractedPdfText = '';
    try {
      const { fileBase64, mimeType, rawText } = req.body as {
        fileBase64?: string;
        mimeType?: string;
        rawText?: string;
      };

      if (!fileBase64 && !rawText) {
        res.status(400).json({ error: 'Nenhum documento enviado para leitura.' });
        return;
      }

      if (rawText) {
        extractedPdfText = rawText;
      } else if (fileBase64 && mimeType === 'application/pdf') {
        try {
          const pdfBytes = new Uint8Array(Buffer.from(fileBase64, 'base64'));
          const { text } = await extractText(pdfBytes, { mergePages: true });
          if (text && text.trim()) {
            extractedPdfText = text.trim();
          }
        } catch (pdfErr) {
          console.warn('Aviso ao extrair texto local do PDF:', pdfErr);
        }
      }

      const promptText = `Você é um extrator preciso de relatórios/documentos de cotação de peças automotivas e serviços de retífica.
Analise o documento de cotação e extraia todos os itens/peças listados na tabela.
Para cada item da cotação, extraia exatamente:
1. "codigoDescricao": O conteúdo do campo "Código Descrição da Peça" (se o Código e a Descrição da Peça estiverem em colunas separadas ou juntas, una-os no formato "CÓDIGO - DESCRIÇÃO DA PEÇA", ou apenas a descrição da peça se não houver código).
2. "qte": O valor numérico do campo "Qte." (ou "Qte", "Qtde.", "Qtde", "Qtd.") do relatório para preencher a quantidade. Converta valores no formato brasileiro (ex: 2,00 -> 2).

Retorne apenas os itens reais da tabela de cotação (ignore linhas de cabeçalho, rodapé, subtotais ou totais gerais).`;

      const parts: any[] = [];
      if (fileBase64 && mimeType) {
        parts.push({
          inlineData: {
            data: fileBase64,
            mimeType,
          },
        });
      }
      if (extractedPdfText) {
        parts.push({
          text: `Texto extraído do documento:\n${extractedPdfText}`,
        });
      }
      parts.push({ text: promptText });

      try {
        const response = await generateWithFallback(parts);
        const textOutput = response.text?.trim();
        if (textOutput) {
          const parsed = JSON.parse(textOutput);
          if (Array.isArray(parsed.itens) && parsed.itens.length > 0) {
            res.json({ itens: parsed.itens });
            return;
          }
        }
      } catch (aiError) {
        console.warn('Modelos de IA indisponíveis no momento, utilizando extrator local:', aiError);
      }

      if (extractedPdfText) {
        const fallbackItens = fallbackParseText(extractedPdfText);
        if (fallbackItens.length > 0) {
          res.json({ itens: fallbackItens });
          return;
        }
      }

      res.json({ itens: [] });
    } catch (error: any) {
      console.error('Erro ao processar cotação:', error);
      if (extractedPdfText) {
        const fallbackItens = fallbackParseText(extractedPdfText);
        if (fallbackItens.length > 0) {
          res.json({ itens: fallbackItens });
          return;
        }
      }
      res.status(500).json({
        error:
          'Não foi possível ler os itens do documento de cotação no momento. Tente novamente.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
