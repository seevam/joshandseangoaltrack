const { verifyToken } = require('@clerk/backend');

async function getUserId(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new Error('Missing authorization token');
  const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
  if (!payload?.sub) throw new Error('Invalid token payload');
  return payload.sub;
}

module.exports = { getUserId };
