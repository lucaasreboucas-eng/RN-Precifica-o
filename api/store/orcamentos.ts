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
    return res.status(200).json({ orcamentos: store.orcamentos });
  }

  if (req.method === 'POST') {
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
      saveGlobalStore(store);
    }
    return res.status(200).json({ orcamentos: store.orcamentos });
  }

  if (req.method === 'PUT') {
    if (Array.isArray(req.body?.orcamentos)) {
      store.orcamentos = req.body.orcamentos;
      saveGlobalStore(store);
    }
    return res.status(200).json({ orcamentos: store.orcamentos });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (id) {
      store.orcamentos = store.orcamentos.filter((it: any) => it.id !== id);
      saveGlobalStore(store);
    }
    return res.status(200).json({ orcamentos: store.orcamentos });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
