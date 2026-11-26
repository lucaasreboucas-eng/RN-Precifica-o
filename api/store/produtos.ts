import { getGlobalStore, saveGlobalStore } from './_store.js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getGlobalStore();
  if (!Array.isArray(store.produtos)) {
    store.produtos = [];
  }
  if (!Array.isArray(store.deletedProdutoIds)) {
    store.deletedProdutoIds = [];
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      produtos: store.produtos,
      deletedProdutoIds: store.deletedProdutoIds,
    });
  }

  if (req.method === 'POST') {
    const prod = req.body?.produto;
    if (prod && prod.id) {
      store.deletedProdutoIds = store.deletedProdutoIds.filter((dId) => dId !== prod.id);
      const exists = store.produtos.some((it: any) => it.id === prod.id);
      if (exists) {
        store.produtos = store.produtos.map((it: any) => (it.id === prod.id ? prod : it));
      } else {
        store.produtos = [prod, ...store.produtos];
      }
      saveGlobalStore(store);
    }
    return res.status(200).json({
      produtos: store.produtos,
      deletedProdutoIds: store.deletedProdutoIds,
    });
  }

  if (req.method === 'PUT') {
    if (Array.isArray(req.body?.produtos)) {
      const deletedSet = new Set(store.deletedProdutoIds);
      store.produtos = req.body.produtos.filter((p: any) => p && p.id && !deletedSet.has(p.id));
      saveGlobalStore(store);
    }
    return res.status(200).json({
      produtos: store.produtos,
      deletedProdutoIds: store.deletedProdutoIds,
    });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (id) {
      const cleanId = String(id).trim();
      store.produtos = store.produtos.filter((it: any) => it.id !== cleanId);
      if (!store.deletedProdutoIds.includes(cleanId)) {
        store.deletedProdutoIds.push(cleanId);
      }
      saveGlobalStore(store);
    }
    return res.status(200).json({
      produtos: store.produtos,
      deletedProdutoIds: store.deletedProdutoIds,
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
