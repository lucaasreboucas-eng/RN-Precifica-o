import { GoogleGenAI, Type } from '@google/genai';
import { extractText } from 'unpdf';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

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

function fallbackParseText(
  text: string
): Array<{ codigoDescricao: string; qte: number; vlUn: number }> {
  const results: Array<{ codigoDescricao: string; qte: number; vlUn: number }> = [];
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const vlUnBeforeQte = /vl\.?\s*un[\s\S]{0,120}?qte/i.test(text);

  const ignoreRegex =
    /^(?:c[oó]digo|item\s+c[oó]digo|vl\.?\s*un|subtotal|total\s+geral|valor\s+total|desconto|frete|cnpj|cpf|insc\.?\s*est|inscri[cç][aã]o|endere[cç]o|rua\s+|telefone|e-?mail|dados\s+do|ordem\s+de\s+servi[cç]o|or[cç]amentista|tipo\s+de\s+cliente|fornecedor|contatos|cota[cç][aã]o\s+de\s+pre[cç]os|n[aã]o\s+se\s+aplica|cliente|vendedor|condi[cç][aã]o|observa[cç][aã]o|p[aá]gina|emiss[aã]o|hora|data\s+de\s+emiss[aã]o|validade|or[cç]amento\s+n|cota[cç][aã]o\s+n)/i;

  let pendingDescLine = '';

  for (const line of rawLines) {
    if (ignoreRegex.test(line)) continue;
    if (/c[oó]digo.*descri[cç][aã]o/i.test(line)) continue;
    if (/vl\.?\s*un.*%?\s*desc/i.test(line)) continue;

    // Remove percentage values like 0,00% so they are not confused with currency/quantity numbers
    const lineWithoutPercent = line.replace(/\b\d{1,3}(?:\.\d{3})*,\d{1,4}\s*%/g, ' ');
    const hasPercentInLine = /\b\d{1,3}(?:\.\d{3})*,\d{1,4}\s*%/.test(line);

    const currencyMatches = [
      ...lineWithoutPercent.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2,4}\b/g),
    ];

    // Check if this line is a description line without decimal values (e.g. "1543 TUBO FLEXIVEL COBREADO KPU 3POLEGA")
    if (currencyMatches.length === 0) {
      if (/^\d+\s+[A-Za-zÀ-ÿ]/.test(line) || /[A-Za-zÀ-ÿ]{3,}/.test(line)) {
        pendingDescLine = line;
      }
      continue;
    }

    let qte = 1;
    let vlUn = 0;
    const firstMatchIndex = currencyMatches[0].index ?? lineWithoutPercent.length;
    const prefixText = lineWithoutPercent.slice(0, firstMatchIndex).trim();

    if (currencyMatches.length >= 3) {
      const n1 = parseBrazilianNumber(currencyMatches[0][0]);
      const n2 = parseBrazilianNumber(currencyMatches[1][0]);
      const n3 = parseBrazilianNumber(currencyMatches[2][0]);

      if (n1 > 0 && n2 > 0 && Math.abs(n1 * n2 - n3) <= Math.max(0.15, n3 * 0.02)) {
        if (vlUnBeforeQte || hasPercentInLine) {
          vlUn = n1;
          qte = n2;
        } else {
          qte = n1;
          vlUn = n2;
        }
      } else {
        if (vlUnBeforeQte || hasPercentInLine) {
          vlUn = n1;
          qte = n2 > 0 ? n2 : 1;
        } else {
          qte = n1 > 0 ? n1 : 1;
          vlUn = n2;
        }
      }
    } else if (currencyMatches.length === 2) {
      const n1 = parseBrazilianNumber(currencyMatches[0][0]);
      const n2 = parseBrazilianNumber(currencyMatches[1][0]);
      const intQtyMatch = prefixText.match(/\b(\d+)\s*(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)?$/i);
      if (intQtyMatch) {
        qte = parseInt(intQtyMatch[1], 10) || 1;
        vlUn = n1;
      } else if (vlUnBeforeQte || hasPercentInLine) {
        vlUn = n1;
        qte = n2 > 0 ? n2 : 1;
      } else {
        qte = n1 > 0 ? n1 : 1;
        vlUn = n2;
      }
    } else if (currencyMatches.length === 1) {
      const n1 = parseBrazilianNumber(currencyMatches[0][0]);
      const intQtyMatch = prefixText.match(/\b(\d+)\s*(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)?$/i);
      if (intQtyMatch) {
        qte = parseInt(intQtyMatch[1], 10) || 1;
        vlUn = n1;
      } else {
        qte = n1 || 1;
      }
    }

    let descPart = prefixText
      .replace(/\s+\d+\s*(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)?\s*$/i, '')
      .replace(/\s+(?:UN|PC|JG|KT|MT|LT|KG|PR|CJ)\s*$/i, '')
      .trim();

    if ((!descPart || !/[A-Za-zÀ-ÿ]{2,}/.test(descPart)) && pendingDescLine) {
      descPart = pendingDescLine;
      pendingDescLine = '';
    } else {
      pendingDescLine = '';
    }

    if (descPart && /[A-Za-zÀ-ÿ]{2,}/.test(descPart) && qte > 0) {
      results.push({
        codigoDescricao: descPart,
        qte,
        vlUn,
      });
    }
  }

  return results;
}

async function generateWithFallback(ai: GoogleGenAI, parts: any[]) {
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
                      vlUn: {
                        type: Type.NUMBER,
                        description: 'Valor numérico do campo Vl. Un. (valor unitário) do relatório.',
                      },
                    },
                    required: ['codigoDescricao', 'qte', 'vlUn'],
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let extractedPdfText = '';
  try {
    const { fileBase64, mimeType, rawText } = (req.body || {}) as {
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

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `Você é um extrator preciso de relatórios/documentos de cotação de peças automotivas e serviços de retífica.
Analise o documento de cotação e extraia todos os itens/peças listados na tabela.
Para cada item da cotação, extraia exatamente:
1. "codigoDescricao": O conteúdo do campo "Código Descrição da Peça" (se o Código e a Descrição da Peça estiverem em colunas separadas ou juntas, una-os no formato "CÓDIGO - DESCRIÇÃO DA PEÇA", ou apenas a descrição da peça se não houver código).
2. "qte": O valor numérico do campo "Qte." (ou "Qte", "Qtde.", "Qtde", "Qtd.") do relatório para preencher a quantidade. Converta valores no formato brasileiro (ex: 3,00 -> 3).
3. "vlUn": O valor numérico da coluna "Vl. Un." (valor unitário) do relatório para preencher o custo unitário. Converta valores no formato brasileiro (ex: 171,43 -> 171.43).

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
        const response = await generateWithFallback(ai, parts);
        const textOutput = response.text?.trim();
        if (textOutput) {
          const parsed = JSON.parse(textOutput);
          if (Array.isArray(parsed.itens) && parsed.itens.length > 0) {
            res.status(200).json({ itens: parsed.itens });
            return;
          }
        }
      } catch (aiError) {
        console.warn('Modelos de IA indisponíveis no momento, utilizando extrator local:', aiError);
      }
    }

    if (extractedPdfText) {
      const fallbackItens = fallbackParseText(extractedPdfText);
      if (fallbackItens.length > 0) {
        res.status(200).json({ itens: fallbackItens });
        return;
      }
    }

    res.status(200).json({ itens: [] });
  } catch (error: any) {
    console.error('Erro ao processar cotação:', error);
    if (extractedPdfText) {
      const fallbackItens = fallbackParseText(extractedPdfText);
      if (fallbackItens.length > 0) {
        res.status(200).json({ itens: fallbackItens });
        return;
      }
    }
    res.status(500).json({
      error:
        'Não foi possível ler os itens do documento de cotação no momento. Tente novamente.',
    });
  }
}
