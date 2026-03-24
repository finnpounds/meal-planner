'use client';

import { useState } from 'react';
import { MacroRing } from './MacroRing';
import type { Meal, NutritionTarget } from '@/lib/types';

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

interface MealCardProps {
  mealType: string;
  meal: Meal;
  nutritionTarget: NutritionTarget;
}

export function MealCard({ mealType, meal, nutritionTarget }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Rings show how much of the daily target this meal covers (not a /4 split)
  const proteinTarget = nutritionTarget.proteinG;
  const carbsTarget = nutritionTarget.carbsG;
  const fatTarget = nutritionTarget.fatG;

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{MEAL_ICONS[mealType] ?? '🍽️'}</span>
          <div>
            <div className="text-xs mb-0.5 capitalize" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              {mealType}
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {meal.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{meal.calories} kcal</div>
            <div className="text-sm font-medium" style={{ color: 'var(--accent)' }}>${meal.cost.toFixed(2)}</div>
          </div>
          <svg
            className="w-4 h-4 transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-3">
            <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              {meal.description}
            </p>
          </div>

          {/* Macros */}
          <div>
            <div className="text-xs mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              % OF DAILY TARGET
            </div>
            <div className="flex gap-4 items-center flex-wrap">
              <MacroRing label="Protein" value={meal.protein} target={proteinTarget} color="#6b8f5e" />
              <MacroRing label="Carbs" value={meal.carbs} target={carbsTarget} color="#8f7a5e" />
              <MacroRing label="Fat" value={meal.fat} target={fatTarget} color="#5e6f8f" />
              <div className="flex flex-col gap-1 text-xs ml-2">
                <div style={{ color: 'var(--text-muted)' }}>Calories</div>
                <div className="font-semibold" style={{ fontFamily: 'DM Mono, monospace' }}>{meal.calories} kcal</div>
                <div style={{ color: 'var(--text-muted)' }}>Cost</div>
                <div className="font-semibold" style={{ color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>${meal.cost.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Ring fill = this meal&apos;s contribution to your daily target
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              INGREDIENTS
            </div>
            <ul className="space-y-1">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span style={{ color: 'var(--accent)' }}>-</span>
                  <span style={{ color: 'var(--text)' }}>{ing}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
