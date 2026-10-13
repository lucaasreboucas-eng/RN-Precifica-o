import { getGlobalStore, saveGlobalStore } from './_store.js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = getGlobalStore();

  if (req.method === 'GET') {
    return res.status(200).json({ users: store.users });
  }

  if (req.method === 'PUT') {
    if (Array.isArray(req.body?.users)) {
      store.users = req.body.users;
      saveGlobalStore(store);
    }
    return res.status(200).json({ users: store.users });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
