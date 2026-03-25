'use client';

import type { MealPlan, NutritionTarget, ValidationResult, DayName } from '@/lib/types';
import { DAYS, MEALS } from '@/lib/constants';

const DAY_SHORT: Record<DayName, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

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
  let totalCarbs = 0;
  let totalFat = 0;

  // Per-day calorie totals for variance bars
  const dailyCals: Record<DayName, number> = {} as Record<DayName, number>;

  for (const day of DAYS) {
    const d = plan[day];
    let dayCals = 0;
    if (d) {
      for (const meal of MEALS) {
        const m = d[meal];
        if (!m) continue;
        totalCost += m.cost ?? 0;
        totalCals += m.calories ?? 0;
        totalProtein += m.protein ?? 0;
        totalCarbs += m.carbs ?? 0;
        totalFat += m.fat ?? 0;
        dayCals += m.calories ?? 0;
      }
    }
    dailyCals[day] = dayCals;
  }

  // Ingredient overlap: % of unique ingredients reused in 2+ meals across the week
  const ingredientMealCount = new Map<string, number>();
  for (const day of DAYS) {
    const d = plan[day];
    if (!d) continue;
    for (const meal of MEALS) {
      const m = d[meal];
      if (!m?.ingredients) continue;
      const seen = new Set<string>();
      for (const ing of m.ingredients) {
        const norm = ing.toLowerCase()
          .replace(/^[\d./½¼¾⅓⅔\s]+(lbs?|oz|cups?|g|tbsp|tsp|cloves?|cans?|each|medium|large|small)?\s+/i, '')
          .replace(/^of\s+/, '')
          .replace(/[,.]$/, '')
          .trim();
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          ingredientMealCount.set(norm, (ingredientMealCount.get(norm) ?? 0) + 1);
        }
      }
    }
  }
  const totalUniqueIngredients = ingredientMealCount.size;
  const sharedIngredients = [...ingredientMealCount.values()].filter(c => c >= 2).length;
  const overlapScore = totalUniqueIngredients > 0
    ? Math.round((sharedIngredients / totalUniqueIngredients) * 100)
    : 0;

  const avgCalsPerDay = Math.round(totalCals / 7);
  const avgProteinPerDay = Math.round(totalProtein / 7);
  const avgCarbsPerDay = Math.round(totalCarbs / 7);
  const avgFatPerDay = Math.round(totalFat / 7);
  const budgetUsedPct = Math.min((totalCost / budget) * 100, 100);

  const maxDayCals = Math.max(...Object.values(dailyCals), 1);

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

      {/* Stats grid — nutrition */}
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[
          { label: 'AVG CALS', value: String(avgCalsPerDay), sub: `target ${nutritionTarget.calories}` },
          { label: 'AVG PROTEIN', value: `${avgProteinPerDay}g`, sub: `target ${nutritionTarget.proteinG}g` },
          { label: 'AVG CARBS', value: `${avgCarbsPerDay}g`, sub: `target ${nutritionTarget.carbsG}g` },
          { label: 'AVG FAT', value: `${avgFatPerDay}g`, sub: `target ${nutritionTarget.fatG}g` },
        ].map(stat => (
          <div key={stat.label} className="rounded p-3" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{stat.label}</div>
            <div className="text-base font-semibold">{stat.value}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Ingredient overlap score */}
      <div className="rounded p-3" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>INGREDIENT REUSE</div>
          <div className="text-base font-semibold">{overlapScore}%</div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${overlapScore}%`, background: overlapScore >= 60 ? 'var(--accent)' : '#8f7a5e' }}
          />
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {sharedIngredients} of {totalUniqueIngredients} ingredients shared across 2+ meals
        </div>
      </div>

      {/* Per-day calorie variance bars */}
      <div>
        <div className="text-xs mb-2 tracking-widest uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
          Daily Calories
        </div>
        <div className="flex items-end gap-1.5" style={{ height: 48 }}>
          {DAYS.map(day => {
            const cals = dailyCals[day] ?? 0;
            const heightPct = maxDayCals > 0 ? (cals / maxDayCals) * 100 : 0;
            const onTarget = Math.abs(cals - nutritionTarget.calories) / nutritionTarget.calories <= 0.1;
            return (
              <div key={day} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full rounded-sm" style={{
                  height: `${heightPct}%`,
                  minHeight: 4,
                  background: onTarget ? 'var(--accent)' : '#8f7a5e',
                  transition: 'height 0.4s ease-out',
                }} />
                <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.55rem' }}>
                  {DAY_SHORT[day]}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
          <span style={{ color: 'var(--accent)' }}>&#9632; within 10% of target</span>
          <span style={{ color: '#8f7a5e' }}>&#9632; off target</span>
        </div>
      </div>

      {/* Data quality + validation */}
      <div
        className="text-xs px-3 py-2 rounded flex items-center gap-2 flex-wrap"
        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
      >
        <span style={{ color: validation.score >= 80 ? 'var(--accent)' : '#e8a870' }}>
          {validation.score}%
        </span>
        prices validated against USDA ERS 2023 / BLS CPI Feb 2026
        {validation.deviations.length > 0 && (
          <span style={{ color: '#e8a870' }}>
            &bull; {validation.deviations.length} meal(s) &gt;20% off
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
