'use client';

import { useState } from 'react';
import { X, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, type Category, type Subtask } from '@/lib/types';

const CATEGORIES: Category[] = ['personal', 'health', 'career', 'finance', 'education', 'fitness'];

const TEMPLATES: Record<Category, { placeholder: string; unit: string; target: string }> = {
  personal:  { placeholder: 'e.g., Read 12 books this year',        unit: 'books',    target: '12' },
  health:    { placeholder: 'e.g., Drink 8 glasses of water daily', unit: 'glasses',  target: '8' },
  career:    { placeholder: 'e.g., Complete 3 certifications',       unit: 'certs',    target: '3' },
  finance:   { placeholder: 'e.g., Save $10,000',                    unit: '$',        target: '10000' },
  education: { placeholder: 'e.g., Complete 5 online courses',       unit: 'courses',  target: '5' },
  fitness:   { placeholder: 'e.g., Run 500 km this year',            unit: 'km',       target: '500' },
};

export default function GoalForm({ onClose }: { onClose: () => void }) {
  const addGoal = useGoalStore(s => s.addGoal);

  const [form, setForm] = useState({
    title: '', description: '', category: 'personal' as Category,
    targetValue: '', unit: '', startDate: new Date().toISOString().split('T')[0], endDate: '',
  });
  const [subtasks, setSubtasks] = useState<Partial<Subtask>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tpl = TEMPLATES[form.category];

  const generateSubtasks = async () => {
    if (!form.title) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Generate 5-7 actionable sub-tasks for the goal. Respond with valid JSON only — an array of {title, daysFromStart} objects.' },
            { role: 'user', content: `Goal: ${form.title}\nCategory: ${form.category}\nTarget: ${form.targetValue} ${form.unit}\nDeadline: ${form.endDate || 'none'}` },
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim() || '[]';
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(text);
      setSubtasks(parsed.map((s: { title: string; daysFromStart: number }, i: number) => ({
        id: Date.now() + i, title: s.title, daysFromStart: s.daysFromStart, completed: false,
      })));
    } catch (err) {
      console.error('Failed to generate subtasks:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.targetValue) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          targetValue: parseFloat(form.targetValue),
          currentValue: 0,
          color: CATEGORY_COLORS[form.category].hex,
          subtasks,
          dailyTasks: [],
          taskCompletions: {},
          checkIns: [],
          progressHistory: [{ date: new Date().toISOString(), value: 0 }],
          milestones: [],
        }),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      const created = await res.json();
      addGoal(created);
      onClose();
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Create New Goal</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Category */}
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => {
              const c = CATEGORY_COLORS[cat];
              return (
                <button
                  key={cat} type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border-2 transition-all ${
                    form.category === cat ? `${c.light} ${c.text} border-transparent` : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={tpl.placeholder}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
              required
            />
          </div>

          {/* Target + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target *</label>
              <input
                type="number" value={form.targetValue}
                onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
                placeholder={tpl.target}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder={tpl.unit}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Why is this goal important to you?"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm resize-none"
            />
          </div>

          {/* AI Subtasks */}
          <div className="bg-gradient-to-r from-[#D7FFB8] to-[#CCFFDD] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#58CC02]" />
                <span className="text-sm font-semibold text-[#2E8B00]">AI-Powered Sub-tasks</span>
              </div>
              <button
                type="button" onClick={generateSubtasks} disabled={isGenerating || !form.title}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGenerating ? 'Generating…' : 'Generate'}
              </button>
            </div>
            {subtasks.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {subtasks.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 bg-white/70 rounded-lg px-3 py-2 text-xs text-gray-700">
                    <span className="truncate">{s.title}</span>
                    <button type="button" onClick={() => setSubtasks(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isSaving || !form.title || !form.targetValue}
              className="flex-1 py-3 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {isSaving ? 'Creating…' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
