import fs from 'fs';
import path from 'path';

export interface ServerStoreData {
  profiles: any[];
  users: any[];
  orcamentos: any[];
  deletedOrcamentoIds: string[];
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

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const deletedOrcamentoIds = Array.isArray(parsed?.deletedOrcamentoIds)
        ? parsed.deletedOrcamentoIds
        : [];
      const deletedSet = new Set(deletedOrcamentoIds);
      const rawOrcamentos = Array.isArray(parsed?.orcamentos) ? parsed.orcamentos : [];
      globalThis.__globalServerStore = {
        profiles: Array.isArray(parsed?.profiles) ? parsed.profiles : DEFAULT_STORE_DATA.profiles,
        users: Array.isArray(parsed?.users) ? parsed.users : DEFAULT_STORE_DATA.users,
        orcamentos: rawOrcamentos.filter((o: any) => o && o.id && !deletedSet.has(o.id)),
        deletedOrcamentoIds,
        defaultParams: parsed?.defaultParams || DEFAULT_STORE_DATA.defaultParams,
      };
      return globalThis.__globalServerStore;
    }
  } catch {}

  try {
    if (fs.existsSync(BACKUP_FILE_PATH)) {
      const raw = fs.readFileSync(BACKUP_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const deletedOrcamentoIds = Array.isArray(parsed?.deletedOrcamentoIds)
        ? parsed.deletedOrcamentoIds
        : [];
      const deletedSet = new Set(deletedOrcamentoIds);
      const rawOrcamentos = Array.isArray(parsed?.orcamentos) ? parsed.orcamentos : [];
      globalThis.__globalServerStore = {
        profiles: Array.isArray(parsed?.profiles) ? parsed.profiles : DEFAULT_STORE_DATA.profiles,
        users: Array.isArray(parsed?.users) ? parsed.users : DEFAULT_STORE_DATA.users,
        orcamentos: rawOrcamentos.filter((o: any) => o && o.id && !deletedSet.has(o.id)),
        deletedOrcamentoIds,
        defaultParams: parsed?.defaultParams || DEFAULT_STORE_DATA.defaultParams,
      };
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
