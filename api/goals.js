const prisma = require('./_lib/prisma');
const { getUserId } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.setHeader('Content-Type', 'application/json');

  let userId;
  try {
    userId = await getUserId(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(goals);
    } catch (err) {
      console.error('GET /api/goals error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const goal = await prisma.goal.create({
        data: {
          userId,
          title: body.title || '',
          description: body.description || '',
          category: body.category || 'personal',
          targetValue: parseFloat(body.targetValue) || 0,
          currentValue: parseFloat(body.currentValue) || 0,
          unit: body.unit || '',
          startDate: body.startDate || null,
          endDate: body.endDate || null,
          color: body.color || '#58CC02',
          subtasks: body.subtasks ?? [],
          dailyTasks: body.dailyTasks ?? [],
          taskCompletions: body.taskCompletions ?? {},
          checkIns: body.checkIns ?? [],
          progressHistory: body.progressHistory ?? [],
          milestones: body.milestones ?? []
        }
      });
      return res.status(201).json(goal);
    } catch (err) {
      console.error('POST /api/goals error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
