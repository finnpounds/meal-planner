'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { DayTabs } from '@/components/DayTabs';
import { MealCard } from '@/components/MealCard';
import { WeeklySummary } from '@/components/WeeklySummary';
import { GroceryList } from '@/components/GroceryList';
import type { DayName } from '@/lib/types';

type Tab = 'plan' | 'grocery';
const DAYS: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const LOADING_MESSAGES = [
  'Analyzing your nutrition targets...',
  'Cross-referencing USDA price data...',
  'Building your 7-day plan...',
  'Optimizing for your budget...',
  'Balancing macros across the week...',
  'Generating grocery list...',
  'Almost done...',
];

export default function PlanPage() {
  const router = useRouter();
  const { result, lastInputs, setResult, setLastInputs } = useMealPlan();
  const [activeTab, setActiveTab] = useState<Tab>('plan');
  const [activeDay, setActiveDay] = useState<DayName>('Monday');
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState('');
  const [regenError, setRegenError] = useState('');

  useEffect(() => {
    if (!result) {
      router.replace('/');
    }
  }, [result, router]);

  if (!result || !lastInputs) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Redirecting...</div>
      </main>
    );
  }

  const { plan, validation, nutritionTarget } = result;
  const dayPlan = plan[activeDay];

  async function handleRegenerate() {
    if (!lastInputs) return;
    setRegenError('');
    setRegenerating(true);
    let msgIdx = 0;
    setRegenMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setRegenMsg(LOADING_MESSAGES[msgIdx]);
    }, 2500);

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastInputs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to regenerate');
      setResult(data);
      setLastInputs(lastInputs);
      setActiveDay('Monday');
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      clearInterval(interval);
      setRegenerating(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              Your Plan
            </p>
            <h1 className="text-2xl" style={{ fontFamily: 'Instrument Serif, serif', color: 'var(--text)' }}>
              7-Day Meal Plan
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push('/')}
              className="text-xs px-3 py-2 rounded transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Edit Inputs
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="text-xs px-3 py-2 rounded transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)', border: 'none', color: '#fff', cursor: regenerating ? 'not-allowed' : 'pointer' }}
            >
              {regenerating ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  <span style={{ fontFamily: 'DM Mono, monospace' }}>{regenMsg}</span>
                </span>
              ) : 'Regenerate'}
            </button>
          </div>
        </div>

        {regenError && (
          <div
            className="rounded p-3 text-sm mb-4"
            style={{ background: '#2a1515', border: '1px solid var(--danger)', color: '#e87070' }}
          >
            {regenError}
            <button
              onClick={handleRegenerate}
              className="ml-3 underline text-xs"
              style={{ color: '#e87070' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Weekly summary */}
        <div className="mb-6">
          <WeeklySummary
            plan={plan}
            budget={lastInputs.budget}
            nutritionTarget={nutritionTarget}
            validation={validation}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--surface)', width: 'fit-content' }}>
          {(['plan', 'grocery'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded text-sm font-medium capitalize transition-colors"
              style={{
                background: activeTab === tab ? 'var(--accent)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                border: 'none',
              }}
            >
              {tab === 'plan' ? 'Meal Plan' : 'Grocery List'}
            </button>
          ))}
        </div>

        {activeTab === 'plan' && (
          <div className="space-y-4">
            <DayTabs activeDay={activeDay} onSelect={setActiveDay} />
            {dayPlan ? (
              <div className="space-y-3 mt-4">
                {MEALS.map(mealType => {
                  const meal = dayPlan[mealType];
                  if (!meal) return null;
                  return (
                    <MealCard
                      key={mealType}
                      mealType={mealType}
                      meal={meal}
                      nutritionTarget={nutritionTarget}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                No plan data for {activeDay}.
              </div>
            )}
          </div>
        )}

        {activeTab === 'grocery' && (
          <GroceryList plan={plan} />
        )}
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
