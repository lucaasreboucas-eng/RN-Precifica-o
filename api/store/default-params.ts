import { getGlobalStore, saveGlobalStore } from './_store.js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getGlobalStore();

  if (req.method === 'GET') {
    return res.status(200).json({ defaultParams: store.defaultParams });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    if (req.body?.defaultParams && typeof req.body.defaultParams === 'object') {
      store.defaultParams = {
        ...store.defaultParams,
        ...req.body.defaultParams,
      };
      saveGlobalStore(store);
    }
    return res.status(200).json({ defaultParams: store.defaultParams });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
