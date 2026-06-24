'use client';

import Link from 'next/link';
import { Target, TrendingUp, Bot, Award, CheckCircle2, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: Target,      title: 'Set Smart Goals',    desc: 'Create goals with targets, deadlines, and categories tailored to your life.' },
  { icon: TrendingUp,  title: 'Track Progress',     desc: 'Log check-ins, update progress, and visualise your journey over time.' },
  { icon: Bot,         title: 'AI Goal Coach',      desc: 'Chat with your personal AI coach to stay motivated and plan your next steps.' },
  { icon: Award,       title: 'Earn Badges',        desc: 'Celebrate consistency and milestones with achievements along the way.' },
];

const STEPS = [
  { n: '1', text: 'Sign up in seconds' },
  { n: '2', text: 'Create your first goal' },
  { n: '3', text: 'Track daily progress' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#58CC02] flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">GoalTrack</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/sign-up" className="px-4 py-2 bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl text-sm font-semibold transition-colors">
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D7FFB8] rounded-full mb-6">
          <CheckCircle2 className="h-4 w-4 text-[#58CC02]" />
          <span className="text-xs font-semibold text-[#2E8B00]">AI-powered goal tracking</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Turn your goals into
          <span className="text-[#58CC02]"> achievements</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl">
          Set meaningful goals, track daily progress, and get personalised coaching from your AI accountability partner.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/sign-up" className="flex items-center justify-center gap-2 px-6 py-3 bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl font-semibold transition-colors">
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/sign-in" className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-14 px-6">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How it works</h2>
          <p className="text-gray-500 text-sm">Get started in minutes, stay on track for months.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto justify-center">
          {STEPS.map(({ n, text }) => (
            <div key={n} className="flex-1 flex flex-col items-center gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-[#58CC02] text-white font-bold flex items-center justify-center text-lg">{n}</div>
              <p className="text-sm font-medium text-gray-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Everything you need</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-[#D7FFB8] flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-[#58CC02]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#58CC02] py-14 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to crush your goals?</h2>
        <p className="text-white/80 text-sm mb-6">Join thousands of people building better habits, one goal at a time.</p>
        <Link href="/sign-up" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#58CC02] rounded-xl font-bold hover:bg-gray-50 transition-colors">
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} GoalTrack. Built with Next.js, Clerk, and OpenAI.
      </footer>
    </div>
  );
}
