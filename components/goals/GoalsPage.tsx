'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Plus, Search, X, ChevronDown, Target } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { getGoalStatus } from '@/lib/types';
import GoalCard from './GoalCard';

const CATEGORIES = ['all', 'fitness', 'health', 'personal', 'career', 'finance', 'education'] as const;
const STATUSES = ['active', 'completed', 'all'] as const;

export default function GoalsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { goals, setGoals } = useGoalStore();
  const setShowCreate = useGoalStore(s => s.setShowCreateGoal);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('active');
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    if (!user || !isLoaded || goals.length) return;
    fetch('/api/goals')
      .then(r => (r.ok ? r.json() : []))
      .then(setGoals)
      .catch(() => setGoals([]));
  }, [user, isLoaded, goals.length, setGoals]);

  const filtered = useMemo(() => goals.filter(g => {
    if (category !== 'all' && g.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!g.title.toLowerCase().includes(q) && !g.description?.toLowerCase().includes(q)) return false;
    }
    const st = getGoalStatus(g);
    if (status === 'active') return st !== 'completed';
    if (status === 'completed') return st === 'completed';
    return true;
  }), [goals, category, search, status]);

  const selectCls =
    'appearance-none bg-card border border-line rounded-xl pl-3 pr-9 py-2 text-sm text-fg '
    + 'focus:outline-none focus:border-brand cursor-pointer capitalize glow-hover';

  return (
    <div className="min-h-screen bg-bg">
      <div className="w-full mx-auto px-4 py-6 sm:px-6 xl:px-8 2xl:px-12 space-y-5">
        <div className="animate-slide-up">
          <div>
            <h1 className="font-display text-3xl tracking-wide"><span className="text-brand-gradient">GO</span><span className="text-fg">ALS</span></h1>
            <p className="text-sm text-muted mt-0.5">{goals.length} goal{goals.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ ['--i' as string]: 1 }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search goals..."
              className="w-full pl-9 pr-9 py-2 bg-card border border-line rounded-xl text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand glow-hover"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted hover:text-fg" />
              </button>
            )}
          </div>
          <div className="relative">
            <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={selectCls}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="h-4 w-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={category} onChange={e => setCategory(e.target.value)} className={selectCls}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
            <ChevronDown className="h-4 w-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card-glow rounded-2xl p-12 text-center animate-slide-up">
            <Target className="h-12 w-12 text-muted-dim mx-auto mb-4" />
            <h3 className="text-base font-medium text-fg mb-1">
              {goals.length === 0 ? 'No goals yet' : 'Nothing matches'}
            </h3>
            <p className="text-sm text-muted">
              {goals.length === 0 ? 'Create your first goal to start earning XP.' : 'Try a different search or filter.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
            {filtered.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={i}
                onClick={() => router.push(`/goals/${goal.id}`)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
