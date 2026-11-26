import fs from 'fs';
import path from 'path';

export interface ServerStoreData {
  profiles: any[];
  users: any[];
  orcamentos: any[];
  deletedOrcamentoIds: string[];
  produtos: any[];
  deletedProdutoIds: string[];
  movimentacoes: any[];
  deletedMovimentacaoIds: string[];
  defaultParams: {
    margemLucroPercent: number;
    impostoFaturamentoPercent: number;
    taxaAdministrativaPercent: number;
    comissaoVendedorPercent: number;
    issPercent: number;
    antecipacaoPercent: number;
  };
}

export const DEFAULT_STORE_DATA: ServerStoreData = {
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
  deletedOrcamentoIds: [],
  produtos: [],
  deletedProdutoIds: [],
  movimentacoes: [],
  deletedMovimentacaoIds: [],
  defaultParams: {
    margemLucroPercent: 30,
    impostoFaturamentoPercent: 6,
    taxaAdministrativaPercent: 5,
    comissaoVendedorPercent: 3,
    issPercent: 2,
    antecipacaoPercent: 1.5,
  },
};

const DATA_FILE_PATH = path.resolve(process.cwd(), 'data', 'app-store.json');
const BACKUP_FILE_PATH = '/tmp/rn-app-store.json';

declare global {
  var __globalServerStore: ServerStoreData | undefined;
}

export function getGlobalStore(): ServerStoreData {
  if (globalThis.__globalServerStore) {
    return globalThis.__globalServerStore;
  }

  const buildFromParsed = (parsed: any): ServerStoreData => {
    const deletedOrcamentoIds = Array.isArray(parsed?.deletedOrcamentoIds)
      ? parsed.deletedOrcamentoIds
      : [];
    const deletedOrcSet = new Set(deletedOrcamentoIds);
    const rawOrcamentos = Array.isArray(parsed?.orcamentos) ? parsed.orcamentos : [];

    const deletedProdutoIds = Array.isArray(parsed?.deletedProdutoIds)
      ? parsed.deletedProdutoIds
      : [];
    const deletedProdSet = new Set(deletedProdutoIds);
    const rawProdutos = Array.isArray(parsed?.produtos) ? parsed.produtos : [];

    const deletedMovimentacaoIds = Array.isArray(parsed?.deletedMovimentacaoIds)
      ? parsed.deletedMovimentacaoIds
      : [];
    const deletedMovSet = new Set(deletedMovimentacaoIds);
    const rawMovimentacoes = Array.isArray(parsed?.movimentacoes) ? parsed.movimentacoes : [];

    return {
      profiles: Array.isArray(parsed?.profiles) ? parsed.profiles : DEFAULT_STORE_DATA.profiles,
      users: Array.isArray(parsed?.users) ? parsed.users : DEFAULT_STORE_DATA.users,
      orcamentos: rawOrcamentos.filter((o: any) => o && o.id && !deletedOrcSet.has(o.id)),
      deletedOrcamentoIds,
      produtos: rawProdutos.filter((p: any) => p && p.id && !deletedProdSet.has(p.id)),
      deletedProdutoIds,
      movimentacoes: rawMovimentacoes.filter((m: any) => m && m.id && !deletedMovSet.has(m.id)),
      deletedMovimentacaoIds,
      defaultParams: parsed?.defaultParams || DEFAULT_STORE_DATA.defaultParams,
    };
  };

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      globalThis.__globalServerStore = buildFromParsed(parsed);
      return globalThis.__globalServerStore;
    }
  } catch {}

  try {
    if (fs.existsSync(BACKUP_FILE_PATH)) {
      const raw = fs.readFileSync(BACKUP_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      globalThis.__globalServerStore = buildFromParsed(parsed);
      return globalThis.__globalServerStore;
    }
  } catch {}

  const initial = JSON.parse(JSON.stringify(DEFAULT_STORE_DATA));
  globalThis.__globalServerStore = initial;
  return initial;
}

export function saveGlobalStore(data: ServerStoreData): void {
  globalThis.__globalServerStore = data;
  const json = JSON.stringify(data, null, 2);

  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE_PATH, json, 'utf-8');
  } catch {}

  try {
    fs.writeFileSync(BACKUP_FILE_PATH, json, 'utf-8');
  } catch {}
}
