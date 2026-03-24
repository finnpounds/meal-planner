'use client';

import type { MealPlan, NutritionTarget, ValidationResult, DayName } from '@/lib/types';

const DAYS: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

interface WeeklySummaryProps {
  plan: MealPlan;
  budget: number;
  nutritionTarget: NutritionTarget;
  validation: ValidationResult;
}

export function WeeklySummary({ plan, budget, nutritionTarget, validation }: WeeklySummaryProps) {
  let totalCost = 0;
  let totalCals = 0;
  let totalProtein = 0;
  let mealCount = 0;

  for (const day of DAYS) {
    const d = plan[day];
    if (!d) continue;
    for (const meal of MEALS) {
      const m = d[meal];
      if (!m) continue;
      totalCost += m.cost ?? 0;
      totalCals += m.calories ?? 0;
      totalProtein += m.protein ?? 0;
      mealCount++;
    }
  }

  const avgCalsPerDay = mealCount > 0 ? Math.round(totalCals / 7) : 0;
  const avgProteinPerDay = mealCount > 0 ? Math.round(totalProtein / 7) : 0;
  const budgetUsedPct = Math.min((totalCost / budget) * 100, 100);

  return (
    <div
      className="rounded-lg p-5 space-y-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
        Weekly Summary
      </h2>

      {/* Budget bar */}
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span style={{ color: 'var(--text-muted)' }}>Weekly cost</span>
          <span style={{ color: totalCost > budget ? '#e87070' : 'var(--accent)' }}>
            ${totalCost.toFixed(2)} / ${budget}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${budgetUsedPct}%`,
              background: totalCost > budget ? '#c0392b' : 'var(--accent)',
            }}
          />
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {budgetUsedPct.toFixed(0)}% of budget used
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded p-3" style={{ background: 'var(--surface-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>AVG CALS</div>
          <div className="text-base font-semibold">{avgCalsPerDay}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>target {nutritionTarget.calories}</div>
        </div>
        <div className="rounded p-3" style={{ background: 'var(--surface-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>AVG PROTEIN</div>
          <div className="text-base font-semibold">{avgProteinPerDay}g</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>target {nutritionTarget.proteinG}g</div>
        </div>
        <div className="rounded p-3" style={{ background: 'var(--surface-2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>DATA SCORE</div>
          <div className="text-base font-semibold" style={{ color: validation.score >= 80 ? 'var(--accent)' : '#e8a870' }}>
            {validation.score}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>USDA validated</div>
        </div>
      </div>

      {/* Validation badge */}
      <div
        className="text-xs px-3 py-2 rounded flex items-center gap-2"
        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
      >
        <span style={{ color: 'var(--accent)' }}>&#9679;</span>
        {validation.score}% of prices validated against USDA ERS 2023 / BLS CPI Feb 2026 data
        {validation.deviations.length > 0 && (
          <span style={{ color: '#e8a870' }}>
            &nbsp;&bull; {validation.deviations.length} meal(s) deviated &gt;20%
          </span>
        )}
      </div>

      {/* Price source attribution */}
      <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
        Prices: Walmart Worcester, MA (Mar 2026) + USDA/BLS national avg
      </div>
    </div>
  );
}
