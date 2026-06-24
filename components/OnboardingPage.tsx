'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
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

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Category[]>([]);
  const [motivation, setMotivation] = useState('medium');

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
      subtitle: 'GoalTrack helps you set, track, and crush your goals with AI-powered coaching.',
      content: (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="h-24 w-24 rounded-full bg-[#D7FFB8] flex items-center justify-center">
            <Target className="h-12 w-12 text-[#58CC02]" />
          </div>
          <ul className="space-y-3 text-left w-full max-w-xs">
            {['Set goals with targets & deadlines', 'Log check-ins & track streaks', 'Get AI coaching & motivation'].map(t => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#58CC02] flex-shrink-0" />
                <span className="text-sm text-gray-700">{t}</span>
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
                  isSelected ? `${c.light} border-transparent` : 'bg-white border-gray-200'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/60' : 'bg-gray-100'}`}>
                  <Icon className={`h-4 w-4 ${isSelected ? c.text : 'text-gray-500'}`} />
                </div>
                <span className={`text-sm font-semibold ${isSelected ? c.text : 'text-gray-700'}`}>{label}</span>
                <span className="text-xs text-gray-400 leading-tight">{desc}</span>
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
                motivation === value ? 'border-[#58CC02] bg-[#D7FFB8]/30' : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              {motivation === value && <CheckCircle2 className="h-5 w-5 text-[#58CC02] ml-auto" />}
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
          <div className="h-24 w-24 rounded-full bg-[#D7FFB8] flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-[#58CC02]" />
          </div>
          <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed">
            {selected.length > 0
              ? `Ready to tackle your ${selected.join(', ')} goals with ${motivation} motivation. Let's go!`
              : "Your dashboard is ready. Create your first goal to get started!"}
          </p>
          <button
            onClick={handleCreateFirst}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl font-semibold transition-colors"
          >
            Create my first goal <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-[#58CC02] transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{currentStep.title}</h1>
            <p className="text-sm text-gray-500">{currentStep.subtitle}</p>
          </div>

          {currentStep.content}

          {step < STEPS.length - 1 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => step === STEPS.length - 2 ? setStep(s => s + 1) : setStep(s => s + 1)}
                disabled={step === 1 && selected.length === 0}
                className="flex-1 py-3 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {step === 0 ? 'Get Started' : 'Continue'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step < STEPS.length - 1 && (
            <button onClick={handleFinish} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600">
              Skip for now
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-[#58CC02]' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
