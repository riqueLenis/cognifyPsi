import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'auth_required' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const sub = payload?.sub;
    if (!sub) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    req.user = { ...payload, sub: String(sub) };
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
