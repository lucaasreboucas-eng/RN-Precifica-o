import { getGlobalStore, saveGlobalStore } from './_store.js';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const store = getGlobalStore();
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

  saveGlobalStore(store);
  return res.status(200).json(store);
}
