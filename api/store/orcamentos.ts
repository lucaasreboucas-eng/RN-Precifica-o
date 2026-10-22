import { getGlobalStore, saveGlobalStore } from './_store.js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getGlobalStore();

  if (req.method === 'GET') {
    return res.status(200).json({ orcamentos: store.orcamentos, deletedOrcamentoIds: store.deletedOrcamentoIds || [] });
  }

  if (req.method === 'POST') {
    const orc = req.body?.orcamento;
    if (orc && orc.id) {
      if (!Array.isArray(store.deletedOrcamentoIds)) {
        store.deletedOrcamentoIds = [];
      }
      store.deletedOrcamentoIds = store.deletedOrcamentoIds.filter((dId) => dId !== orc.id);

      const exists = store.orcamentos.some((it: any) => it.id === orc.id);
      if (exists) {
        store.orcamentos = store.orcamentos.map((it: any) =>
          it.id === orc.id ? orc : it
        );
      } else {
        store.orcamentos = [orc, ...store.orcamentos];
      }
      saveGlobalStore(store);
    }
    return res.status(200).json({ orcamentos: store.orcamentos, deletedOrcamentoIds: store.deletedOrcamentoIds || [] });
  }

  if (req.method === 'PUT') {
    if (Array.isArray(req.body?.orcamentos)) {
      const deletedSet = new Set(store.deletedOrcamentoIds || []);
      store.orcamentos = req.body.orcamentos.filter((o: any) => o && o.id && !deletedSet.has(o.id));
      saveGlobalStore(store);
    }
    return res.status(200).json({ orcamentos: store.orcamentos, deletedOrcamentoIds: store.deletedOrcamentoIds || [] });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (id) {
      const cleanId = String(id).trim();
      store.orcamentos = store.orcamentos.filter((it: any) => it.id !== cleanId);
      if (!Array.isArray(store.deletedOrcamentoIds)) {
        store.deletedOrcamentoIds = [];
      }
      if (!store.deletedOrcamentoIds.includes(cleanId)) {
        store.deletedOrcamentoIds.push(cleanId);
      }
      saveGlobalStore(store);
    }
    return res.status(200).json({ orcamentos: store.orcamentos, deletedOrcamentoIds: store.deletedOrcamentoIds || [] });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
