const { createClerkClient } = require('@clerk/backend');

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function getUserId(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new Error('Missing authorization token');
  const payload = await clerk.verifyToken(token);
  if (!payload?.sub) throw new Error('Invalid token payload');
  return payload.sub;
}

module.exports = { getUserId };
