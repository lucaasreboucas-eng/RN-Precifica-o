import { getGlobalStore } from './_store.js';

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

  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const store = getGlobalStore();

  const matchedUser = store.users.find(
    (u: any) => String(u.email || '').trim().toLowerCase() === cleanEmail
  );

  if (!matchedUser) {
    return res.status(401).json({ success: false, error: 'E-mail ou senha incorretos.' });
  }

  if (matchedUser.status === 'bloqueado') {
    return res.status(403).json({
      success: false,
      error: 'Este usuário está bloqueado. Contate o administrador.',
    });
  }

  if (!matchedUser.password || matchedUser.password !== password) {
    return res.status(401).json({ success: false, error: 'E-mail ou senha incorretos.' });
  }

  const matchedProfile = store.profiles.find((p: any) => p.id === matchedUser.profileId);

  return res.status(200).json({
    success: true,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      fullName: matchedUser.name,
      role:
        matchedProfile?.name ||
        (matchedUser.profileId === 'perfil-admin' ? 'Administrador Geral' : 'Orçamentista'),
      createdAt: matchedUser.createdAt || new Date().toISOString(),
    },
  });
}
