import { getGlobalStore, saveGlobalStore } from './store/_store.js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const store = getGlobalStore();
    return res.status(200).json(store);
  }

  if (req.method === 'POST') {
    const store = getGlobalStore();
    const updated = { ...store, ...(req.body || {}) };
    saveGlobalStore(updated);
    return res.status(200).json(updated);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
