import { getGlobalStore, saveGlobalStore } from './_store.js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getGlobalStore();
  if (!Array.isArray(store.movimentacoes)) {
    store.movimentacoes = [];
  }
  if (!Array.isArray(store.deletedMovimentacaoIds)) {
    store.deletedMovimentacaoIds = [];
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      movimentacoes: store.movimentacoes,
      deletedMovimentacaoIds: store.deletedMovimentacaoIds,
    });
  }

  if (req.method === 'POST') {
    const mov = req.body?.movimentacao;
    if (mov && mov.id) {
      store.deletedMovimentacaoIds = store.deletedMovimentacaoIds.filter((dId) => dId !== mov.id);
      const exists = store.movimentacoes.some((it: any) => it.id === mov.id);
      if (exists) {
        store.movimentacoes = store.movimentacoes.map((it: any) => (it.id === mov.id ? mov : it));
      } else {
        store.movimentacoes = [mov, ...store.movimentacoes];
      }
      saveGlobalStore(store);
    }
    return res.status(200).json({
      movimentacoes: store.movimentacoes,
      deletedMovimentacaoIds: store.deletedMovimentacaoIds,
    });
  }

  if (req.method === 'PUT') {
    if (Array.isArray(req.body?.movimentacoes)) {
      const deletedSet = new Set(store.deletedMovimentacaoIds);
      store.movimentacoes = req.body.movimentacoes.filter(
        (m: any) => m && m.id && !deletedSet.has(m.id)
      );
      saveGlobalStore(store);
    }
    return res.status(200).json({
      movimentacoes: store.movimentacoes,
      deletedMovimentacaoIds: store.deletedMovimentacaoIds,
    });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (id) {
      const cleanId = String(id).trim();
      store.movimentacoes = store.movimentacoes.filter((it: any) => it.id !== cleanId);
      if (!store.deletedMovimentacaoIds.includes(cleanId)) {
        store.deletedMovimentacaoIds.push(cleanId);
      }
      saveGlobalStore(store);
    }
    return res.status(200).json({
      movimentacoes: store.movimentacoes,
      deletedMovimentacaoIds: store.deletedMovimentacaoIds,
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
