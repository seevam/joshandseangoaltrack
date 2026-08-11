'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Target, Flame, Briefcase, BookOpen, DollarSign, Heart, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CATEGORY_COLORS, type Category } from '@/lib/types';
import { useGoalStore } from '@/lib/store';

const CATEGORY_META: Record<Category, { icon: typeof Target; label: string; desc: string }> = {
  fitness:   { icon: Flame,     label: 'Fitness',    desc: 'Exercise, running, sports' },
  health:    { icon: Heart,     label: 'Health',     desc: 'Nutrition, sleep, wellness' },
  career:    { icon: Briefcase, label: 'Career',     desc: 'Skills, projects, promotion' },
  education: { icon: BookOpen,  label: 'Education',  desc: 'Courses, reading, learning' },
  finance:   { icon: DollarSign,label: 'Finance',    desc: 'Savings, budgeting, investing' },
  personal:  { icon: Target,    label: 'Personal',   desc: 'Hobbies, relationships, habits' },
};

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

const MOTIVATION_LEVELS = [
  { value: 'low', label: 'Low', emoji: '😴', desc: 'Just getting started' },
  { value: 'medium', label: 'Medium', emoji: '💪', desc: 'Ready to put in work' },
  { value: 'high', label: 'High', emoji: '🔥', desc: 'All in — let\'s go!' },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const setShowAddGoal = useGoalStore(s => s.setShowAddGoal);
  const setCoachPersona = useGoalStore(s => s.setCoachPersona);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Category[]>([]);
  const [motivation, setMotivation] = useState('medium');
  const [persona, setPersona] = useState<'energetic' | 'calm' | 'direct'>('calm');

  const choosePersona = (p: 'energetic' | 'calm' | 'direct') => {
    setPersona(p);
    setCoachPersona(p);
  };

  const toggleCat = (cat: Category) => {
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleFinish = () => {
    router.push('/home');
  };

  const handleCreateFirst = () => {
    router.push('/home');
    setTimeout(() => setShowAddGoal(true), 100);
  };

  const STEPS = [
    {
      title: `Welcome, ${user?.firstName || 'friend'}! 👋`,
      subtitle: 'Goal Quest helps you set, track, and crush your goals with AI-powered coaching.',
      content: (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="h-24 w-24 rounded-full bg-[var(--brand-light)] flex items-center justify-center">
            <Image src="/logo-removebg-preview.png" alt="Goal Quest Logo" width={64} height={64} className="object-contain" />
          </div>
          <ul className="space-y-3 text-left w-full max-w-xs">
            {['Set goals with targets & deadlines', 'Log check-ins & track streaks', 'Get AI coaching & motivation'].map(t => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[var(--brand)] flex-shrink-0" />
                <span className="text-sm text-fg">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: 'What areas matter most?',
      subtitle: 'Select the categories you want to focus on.',
      content: (
        <div className="grid grid-cols-2 gap-3 py-2">
          {CATEGORIES.map(cat => {
            const { icon: Icon, label, desc } = CATEGORY_META[cat];
            const c = CATEGORY_COLORS[cat];
            const isSelected = selected.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected ? `${c.light} border-transparent` : 'bg-card border-line'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-card/60' : 'bg-elevated'}`}>
                  <Icon className={`h-4 w-4 ${isSelected ? c.text : 'text-muted'}`} />
                </div>
                <span className={`text-sm font-semibold ${isSelected ? c.text : 'text-fg'}`}>{label}</span>
                <span className="text-xs text-muted leading-tight">{desc}</span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: 'How motivated are you?',
      subtitle: 'We\'ll tailor your experience to your energy level.',
      content: (
        <div className="space-y-3 py-2">
          {MOTIVATION_LEVELS.map(({ value, label, emoji, desc }) => (
            <button
              key={value}
              onClick={() => setMotivation(value)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                motivation === value ? 'border-[var(--brand)] bg-[var(--brand-light)]/30' : 'border-line bg-card'
              }`}
            >
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="font-semibold text-fg">{label}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
              {motivation === value && <CheckCircle2 className="h-5 w-5 text-[var(--brand)] ml-auto" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Pick your coach style',
      subtitle: 'How should your AI coach talk to you?',
      content: (
        <div className="space-y-3 py-2">
          {[
            { value: 'energetic' as const, emoji: '🔥', label: 'Energetic', desc: 'High-energy motivator, lots of hype' },
            { value: 'calm'      as const, emoji: '🌊', label: 'Calm',      desc: 'Steady, supportive, reassuring' },
            { value: 'direct'    as const, emoji: '🎯', label: 'Direct',    desc: 'No-nonsense, straight to the action' },
          ].map(({ value, emoji, label, desc }) => (
            <button
              key={value}
              onClick={() => choosePersona(value)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                persona === value ? 'border-[var(--brand)] bg-[var(--brand-light)]/30' : 'border-line bg-card'
              }`}
            >
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="font-semibold text-fg">{label}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
              {persona === value && <CheckCircle2 className="h-5 w-5 text-[var(--brand)] ml-auto" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "You're all set! 🎉",
      subtitle: 'Your goal tracking journey starts now.',
      content: (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="h-24 w-24 rounded-full bg-[var(--brand-light)] flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-[var(--brand)]" />
          </div>
          <p className="text-sm text-muted text-center max-w-xs leading-relaxed">
            {selected.length > 0
              ? `Ready to tackle your ${selected.join(', ')} goals with ${motivation} motivation. Let's go!`
              : "Your dashboard is ready. Create your first goal to get started!"}
          </p>
          <button
            onClick={handleCreateFirst}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-black rounded-xl font-semibold transition-colors"
          >
            Create my first goal <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-elevated flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-lg overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-elevated">
          <div
            className="h-1 bg-[var(--brand)] transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-fg mb-1">{currentStep.title}</h1>
            <p className="text-sm text-muted">{currentStep.subtitle}</p>
          </div>

          {currentStep.content}

          {step < STEPS.length - 1 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3 border border-line text-muted rounded-xl font-semibold text-sm hover:bg-elevated"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => step === STEPS.length - 2 ? setStep(s => s + 1) : setStep(s => s + 1)}
                disabled={step === 1 && selected.length === 0}
                className="flex-1 py-3 bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:bg-line text-black rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {step === 0 ? 'Get Started' : 'Continue'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step < STEPS.length - 1 && (
            <button onClick={handleFinish} className="w-full mt-3 text-xs text-muted hover:text-muted">
              Skip for now
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-[var(--brand)]' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
