const prisma = require('../_lib/prisma');
const { getUserId } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  let userId;
  try {
    userId = await getUserId(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const existing = await prisma.goal.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Goal not found' });

      const body = req.body || {};
      const data = {};
      const fields = [
        'title', 'description', 'category', 'unit', 'startDate', 'endDate', 'color',
        'subtasks', 'dailyTasks', 'taskCompletions', 'checkIns', 'progressHistory', 'milestones'
      ];
      for (const f of fields) {
        if (body[f] !== undefined) data[f] = body[f];
      }
      if (body.targetValue !== undefined) data.targetValue = parseFloat(body.targetValue);
      if (body.currentValue !== undefined) data.currentValue = parseFloat(body.currentValue);

      const updated = await prisma.goal.update({ where: { id }, data });
      return res.json(updated);
    } catch (err) {
      console.error(`PUT /api/goals/${id} error:`, err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const existing = await prisma.goal.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Goal not found' });
      await prisma.goal.delete({ where: { id } });
      return res.json({ success: true });
    } catch (err) {
      console.error(`DELETE /api/goals/${id} error:`, err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
