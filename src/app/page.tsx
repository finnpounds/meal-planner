'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { calcTDEE, calcCalorieTarget } from '@/lib/nutrition';
import { LOADING_MESSAGES } from '@/lib/constants';
import { Spinner } from '@/components/Spinner';
import type { ActivityLevel, UserInputs, WeightGoal } from '@/lib/types';

const BUDGET_PRESETS = [50, 75, 100, 150];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Hard training daily' },
];

const DIETARY_PREFS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Low-Carb',
  'Gluten-Free', 'Dairy-Free', 'High-Protein', 'Mediterranean', 'No Restrictions',
];

export default function HomePage() {
  const router = useRouter();
  const { setResult, setLastInputs } = useMealPlan();

  const [budget, setBudget] = useState('100');
  const [age, setAge] = useState('25');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weightLbs, setWeightLbs] = useState('170');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('10');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<WeightGoal>('maintain');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [tdee, setTdee] = useState(0);
  const [calTarget, setCalTarget] = useState(0);

  const ageNum = parseInt(age) || 0;
  const weightNum = parseFloat(weightLbs) || 0;
  const heightFtNum = parseInt(heightFt) || 0;
  const heightInNum = parseInt(heightIn) || 0;
  const budgetNum = parseFloat(budget) || 0;
  const heightInches = heightFtNum * 12 + heightInNum;

  useEffect(() => {
    const t = calcTDEE({ weightLbs: weightNum, heightInches, age: ageNum, sex, activityLevel });
    const c = calcCalorieTarget(t, goal, sex);
    setTdee(t);
    setCalTarget(c);
  }, [weightNum, heightInches, ageNum, sex, activityLevel, goal]);

  function togglePref(pref: string) {
    if (pref === 'No Restrictions') {
      setDietaryPrefs(['No Restrictions']);
      return;
    }
    setDietaryPrefs(prev => {
      const without = prev.filter(p => p !== 'No Restrictions');
      return without.includes(pref) ? without.filter(p => p !== pref) : [...without, pref];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let msgIdx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 2500);

    const inputs: UserInputs = {
      budget: budgetNum,
      age: ageNum,
      sex,
      weightLbs: weightNum,
      heightInches,
      activityLevel,
      goal,
      dietaryPrefs: dietaryPrefs.filter(p => p !== 'No Restrictions'),
      specialRequests,
    };

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to generate plan');
      }
      setResult(data);
      setLastInputs(inputs);
      router.push('/plan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  const goalCalDiff = goal === 'lose' ? -500 : goal === 'gain' ? +300 : 0;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            AI-Powered
          </p>
          <h1 className="text-4xl mb-3" style={{ fontFamily: 'Instrument Serif, serif', color: 'var(--text)' }}>
            Meal Planner
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Enter your details to generate a personalized 7-day meal plan grounded in USDA price data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Budget */}
          <section>
            <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              Weekly Grocery Budget
            </label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {BUDGET_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBudget(String(p))}
                  className="px-4 py-2 rounded text-sm font-medium transition-colors"
                  style={{
                    background: budgetNum === p ? 'var(--accent)' : 'var(--surface)',
                    color: budgetNum === p ? '#fff' : 'var(--text)',
                    border: `1px solid ${budgetNum === p ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  ${p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }}>$</span>
              <input
                type="number"
                min={20}
                max={500}
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="w-32 px-3 py-2 rounded text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>per week</span>
            </div>
            {budgetNum > 0 && budgetNum < 40 && (
              <p className="text-xs mt-2" style={{ color: '#e8a870' }}>
                Under $40/week makes it hard to generate realistic meals for one adult.
              </p>
            )}
          </section>

          {/* Biometrics */}
          <section>
            <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              About You
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Age</label>
                <input
                  type="number" min={14} max={100} value={age}
                  onChange={e => setAge(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Sex</label>
                <div className="flex gap-2">
                  {(['male', 'female'] as const).map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => setSex(s)}
                      className="flex-1 py-2 rounded text-sm capitalize transition-colors"
                      style={{
                        background: sex === s ? 'var(--accent)' : 'var(--surface)',
                        color: sex === s ? '#fff' : 'var(--text)',
                        border: `1px solid ${sex === s ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Weight (lbs)</label>
                <input
                  type="number" min={80} max={500} value={weightLbs}
                  onChange={e => setWeightLbs(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Height</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min={3} max={7} value={heightFt}
                    onChange={e => setHeightFt(e.target.value)}
                    className="w-16 px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ft</span>
                  <input
                    type="number" min={0} max={11} value={heightIn}
                    onChange={e => setHeightIn(e.target.value)}
                    className="w-16 px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>in</span>
                </div>
              </div>
            </div>
          </section>

          {/* Activity */}
          <section>
            <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              Activity Level
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ACTIVITY_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => setActivityLevel(opt.value)}
                  className="flex items-center justify-between px-4 py-3 rounded text-sm transition-colors text-left"
                  style={{
                    background: activityLevel === opt.value ? 'var(--accent)' : 'var(--surface)',
                    color: activityLevel === opt.value ? '#fff' : 'var(--text)',
                    border: `1px solid ${activityLevel === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Goal */}
          <section>
            <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              Weight Goal
            </label>
            <div className="flex gap-2">
              {([
                { value: 'lose' as WeightGoal, label: 'Lose', adj: '-500 kcal' },
                { value: 'maintain' as WeightGoal, label: 'Maintain', adj: 'TDEE' },
                { value: 'gain' as WeightGoal, label: 'Gain', adj: '+300 kcal' },
              ]).map(g => (
                <button
                  key={g.value} type="button"
                  onClick={() => setGoal(g.value)}
                  className="flex-1 py-3 rounded text-sm font-medium transition-colors"
                  style={{
                    background: goal === g.value ? 'var(--accent)' : 'var(--surface)',
                    color: goal === g.value ? '#fff' : 'var(--text)',
                    border: `1px solid ${goal === g.value ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <div>{g.label}</div>
                  <div className="text-xs opacity-70">{g.adj}</div>
                </button>
              ))}
            </div>
            {calTarget > 0 && (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                TDEE: {tdee} kcal/day &rarr; Target: <strong style={{ color: 'var(--text)' }}>{calTarget} kcal/day</strong>
                {goalCalDiff !== 0 && ` (${goalCalDiff > 0 ? '+' : ''}${goalCalDiff} kcal)`}
              </p>
            )}
          </section>

          {/* Dietary prefs */}
          <section>
            <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              Dietary Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_PREFS.map(pref => {
                const active = dietaryPrefs.includes(pref);
                return (
                  <button
                    key={pref} type="button"
                    onClick={() => togglePref(pref)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: active ? 'var(--accent)' : 'var(--surface)',
                      color: active ? '#fff' : 'var(--text)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {pref}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Special requests */}
          <section>
            <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              Special Requests (optional)
            </label>
            <textarea
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value)}
              rows={3}
              placeholder="e.g. No spicy food, prefer Mediterranean flavors, avoid pork..."
              className="w-full px-3 py-2 rounded text-sm resize-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </section>

          {/* Summary bar */}
          {calTarget > 0 && (
            <div
              className="rounded p-4 flex flex-wrap gap-6 text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>BUDGET</div>
                <div style={{ color: 'var(--accent)' }} className="font-semibold">${budgetNum}/week</div>
              </div>
              <div>
                <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>CALORIES</div>
                <div className="font-semibold">{calTarget} kcal/day</div>
              </div>
              <div>
                <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>TDEE</div>
                <div className="font-semibold">{tdee} kcal</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded p-4 text-sm"
              style={{ background: '#2a1515', border: '1px solid var(--danger)', color: '#e87070' }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded font-semibold text-sm transition-colors disabled:opacity-60"
            style={{
              background: loading ? 'var(--surface)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <Spinner size={4} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem' }}>{loadingMsg}</span>
              </span>
            ) : (
              'Generate My Meal Plan'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

