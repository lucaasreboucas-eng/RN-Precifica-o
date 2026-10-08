import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { extractText } from 'unpdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE_PATH = path.join(__dirname, 'data', 'app-store.json');

interface ServerStoreData {
  profiles: any[];
  users: any[];
  orcamentos: any[];
  defaultParams: {
    margemLucroPercent: number;
    impostoFaturamentoPercent: number;
    taxaAdministrativaPercent: number;
    comissaoVendedorPercent: number;
    issPercent: number;
    antecipacaoPercent: number;
  };
}

const DEFAULT_STORE_DATA: ServerStoreData = {
  profiles: [
    {
      id: 'perfil-admin',
      name: 'Administrador Geral',
      description: 'Acesso total a todas as abas e sub-abas.',
      permissions: [
        'gestao-precos-orcamentos',
        'configuracoes-perfis',
        'configuracoes-usuarios',
      ],
      isSystem: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  users: [
    {
      id: 'user-adm',
      name: 'Administrador Geral',
      email: 'adm@rnprecificacao.com.br',
      password: 'adm12345',
      profileId: 'perfil-admin',
      status: 'ativo',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  orcamentos: [],
  defaultParams: {
    margemLucroPercent: 30,
    impostoFaturamentoPercent: 6,
    taxaAdministrativaPercent: 5,
    comissaoVendedorPercent: 3,
    issPercent: 2,
    antecipacaoPercent: 1.5,
  },
};

function readStore(): ServerStoreData {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const profiles = Array.isArray(parsed.profiles) && parsed.profiles.length > 0
        ? parsed.profiles
        : DEFAULT_STORE_DATA.profiles;
      const users = Array.isArray(parsed.users) && parsed.users.length > 0
        ? parsed.users
        : DEFAULT_STORE_DATA.users;
      const hasAdminUser = users.some(
        (u: any) => String(u.email || '').toLowerCase() === 'adm@rnprecificacao.com.br'
      );
      if (!hasAdminUser) {
        users.unshift(DEFAULT_STORE_DATA.users[0]);
      }
      const hasAdminProfile = profiles.some((p: any) => p.id === 'perfil-admin');
      if (!hasAdminProfile) {
        profiles.unshift(DEFAULT_STORE_DATA.profiles[0]);
      }
      return {
        profiles,
        users,
        orcamentos: Array.isArray(parsed.orcamentos) ? parsed.orcamentos : [],
        defaultParams:
          parsed.defaultParams && typeof parsed.defaultParams === 'object'
            ? { ...DEFAULT_STORE_DATA.defaultParams, ...parsed.defaultParams }
            : { ...DEFAULT_STORE_DATA.defaultParams },
      };
    }
  } catch (err) {
    console.error('Erro ao ler banco de dados local:', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STORE_DATA));
}

function writeStore(data: ServerStoreData): void {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar banco de dados local:', err);
  }
}

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

  app.get('/api/config', (_req, res) => {
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      '';
    const supabaseAnonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    res.status(200).json({
      supabaseUrl,
      supabaseAnonKey,
    });
  });

  // --- Persistent Server Store Endpoints (Cross-Device Sync) ---
  app.get('/api/store', (_req, res) => {
    const store = readStore();
    res.json(store);
  });

  app.post('/api/store/sync', (req, res) => {
    const store = readStore();
    const { profiles, users, orcamentos, defaultParams } = req.body || {};

    if (Array.isArray(profiles)) {
      const existingIds = new Set(store.profiles.map((p: any) => p.id));
      for (const p of profiles) {
        if (p && p.id && p.id !== 'perfil-orcamentista') {
          if (!existingIds.has(p.id)) {
            store.profiles.push(p);
            existingIds.add(p.id);
          } else {
            store.profiles = store.profiles.map((item: any) =>
              item.id === p.id ? { ...item, ...p } : item
            );
          }
        }
      }
    }

    if (Array.isArray(users)) {
      const existingIds = new Set(store.users.map((u: any) => u.id));
      const existingEmails = new Set(
        store.users.map((u: any) => String(u.email || '').toLowerCase())
      );
      for (const u of users) {
        if (u && u.id && !['user-1', 'user-2'].includes(u.id)) {
          const emailLower = String(u.email || '').toLowerCase();
          if (!existingIds.has(u.id) && !existingEmails.has(emailLower)) {
            store.users.push(u);
            existingIds.add(u.id);
            existingEmails.add(emailLower);
          } else {
            store.users = store.users.map((item: any) =>
              item.id === u.id || String(item.email || '').toLowerCase() === emailLower
                ? { ...item, ...u }
                : item
            );
          }
        }
      }
    }

    if (Array.isArray(orcamentos)) {
      const existingIds = new Set(store.orcamentos.map((o: any) => o.id));
      for (const o of orcamentos) {
        if (o && o.id && !['orc-1', 'orc-2', 'orc-3'].includes(o.id)) {
          if (!existingIds.has(o.id)) {
            store.orcamentos.unshift(o);
            existingIds.add(o.id);
          } else {
            store.orcamentos = store.orcamentos.map((item: any) =>
              item.id === o.id ? { ...item, ...o } : item
            );
          }
        }
      }
    }

    if (defaultParams && typeof defaultParams === 'object') {
      store.defaultParams = {
        ...store.defaultParams,
        ...defaultParams,
      };
    }

    writeStore(store);
    res.json(store);
  });

  app.put('/api/store/profiles', (req, res) => {
    const store = readStore();
    if (Array.isArray(req.body?.profiles)) {
      store.profiles = req.body.profiles;
      writeStore(store);
    }
    res.json({ profiles: store.profiles });
  });

  app.put('/api/store/users', (req, res) => {
    const store = readStore();
    if (Array.isArray(req.body?.users)) {
      store.users = req.body.users;
      writeStore(store);
    }
    res.json({ users: store.users });
  });

  app.put('/api/store/orcamentos', (req, res) => {
    const store = readStore();
    if (Array.isArray(req.body?.orcamentos)) {
      store.orcamentos = req.body.orcamentos;
      writeStore(store);
    }
    res.json({ orcamentos: store.orcamentos });
  });

  app.post('/api/store/orcamentos', (req, res) => {
    const store = readStore();
    const orc = req.body?.orcamento;
    if (orc && orc.id) {
      const exists = store.orcamentos.some((it: any) => it.id === orc.id);
      if (exists) {
        store.orcamentos = store.orcamentos.map((it: any) =>
          it.id === orc.id ? orc : it
        );
      } else {
        store.orcamentos = [orc, ...store.orcamentos];
      }
      writeStore(store);
    }
    res.json({ orcamentos: store.orcamentos });
  });

  app.delete('/api/store/orcamentos/:id', (req, res) => {
    const store = readStore();
    const { id } = req.params;
    store.orcamentos = store.orcamentos.filter((it: any) => it.id !== id);
    writeStore(store);
    res.json({ orcamentos: store.orcamentos });
  });

  app.put('/api/store/default-params', (req, res) => {
    const store = readStore();
    if (req.body?.defaultParams && typeof req.body.defaultParams === 'object') {
      store.defaultParams = {
        ...store.defaultParams,
        ...req.body.defaultParams,
      };
      writeStore(store);
    }
    res.json({ defaultParams: store.defaultParams });
  });

  app.post('/api/store/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const store = readStore();
    const matchedUser = store.users.find(
      (u: any) => String(u.email || '').trim().toLowerCase() === cleanEmail
    );
    if (!matchedUser) {
      res.status(401).json({ success: false, error: 'E-mail ou senha incorretos.' });
      return;
    }
    if (matchedUser.status === 'bloqueado') {
      res.status(403).json({
        success: false,
        error: 'Este usuário está bloqueado. Contate o administrador.',
      });
      return;
    }
    if (!matchedUser.password || matchedUser.password !== password) {
      res.status(401).json({ success: false, error: 'E-mail ou senha incorretos.' });
      return;
    }
    const matchedProfile = store.profiles.find(
      (p: any) => p.id === matchedUser.profileId
    );
    res.json({
      success: true,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        fullName: matchedUser.name,
        role:
          matchedProfile?.name ||
          (matchedUser.profileId === 'perfil-admin' ? 'Administrador Geral' : 'Orçamentista'),
        createdAt: matchedUser.createdAt || new Date().toISOString(),
      },
    });
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
