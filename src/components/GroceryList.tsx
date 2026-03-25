'use client';

import { useState, useMemo } from 'react';
import type { MealPlan } from '@/lib/types';
import { DAYS, MEALS } from '@/lib/constants';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Produce: ['apple', 'banana', 'orange', 'lemon', 'lime', 'berry', 'berries', 'grape', 'melon', 'mango', 'avocado', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'broccoli', 'spinach', 'lettuce', 'kale', 'celery', 'cucumber', 'zucchini', 'pepper', 'corn', 'mushroom', 'ginger', 'cilantro', 'parsley', 'basil', 'scallion', 'green onion', 'cabbage', 'cauliflower', 'asparagus', 'pea', 'edamame'],
  Protein: ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna', 'shrimp', 'tilapia', 'cod', 'egg', 'tofu', 'tempeh', 'sausage', 'bacon', 'ham', 'lamb', 'steak', 'ground', 'lentil', 'bean', 'chickpea'],
  Dairy: ['milk', 'butter', 'cheese', 'yogurt', 'cream', 'mozzarella', 'parmesan', 'feta', 'cheddar', 'cottage', 'sour cream'],
  Grains: ['rice', 'pasta', 'bread', 'tortilla', 'oat', 'quinoa', 'flour', 'couscous', 'noodle', 'cereal', 'cracker'],
  Pantry: ['oil', 'sauce', 'vinegar', 'honey', 'maple', 'broth', 'stock', 'canned', 'paste', 'salt', 'pepper', 'spice', 'seasoning', 'sugar', 'baking', 'tahini', 'peanut butter', 'almond', 'walnut', 'cashew', 'pecan', 'nut', 'seed', 'chip', 'salsa', 'mustard', 'mayo', 'ketchup', 'hot sauce', 'sriracha', 'soy sauce', 'coconut milk', 'tomato sauce'],
};

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
}

function normalizeIngredient(raw: string): string {
  // Strip leading quantity+unit pattern, lowercase, trim
  return raw
    .toLowerCase()
    .replace(/^[\d./½¼¾⅓⅔\s]+(lbs?|pounds?|oz|ounces?|cups?|g|kg|gallons?|pints?|dozen|doz|bunch|cans?|packages?|pkg|bottles?|heads?|each|tbsp|tsp|cloves?|stalks?|slices?|medium|large|small)?\s+/i, '')
    .replace(/^of\s+/, '')
    .replace(/[,.]$/, '')
    .trim();
}

// Quantity parsing for aggregated display (e.g., "~24 oz" instead of "4x")
const UNIT_CANONICAL: Record<string, string> = {
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  cup: 'cup', cups: 'cup',
  tbsp: 'tbsp', tsp: 'tsp',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg',
};
const QTY_PARSE_RE = /^([\d./½¼¾⅓⅔]+)\s*(oz|ounces?|lbs?|pounds?|cups?|tbsp|tsp|g|grams?|kg)?/i;
const FRAC_MAP: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };

function parseQty(raw: string): { amount: number; unit: string } | null {
  const m = raw.trim().match(QTY_PARSE_RE);
  if (!m || !m[1]) return null;
  let amtStr = m[1];
  // Handle mixed whole+fraction: "1½" → "1.5" before standalone "½" → "0.5"
  for (const [sym, val] of Object.entries(FRAC_MAP)) {
    amtStr = amtStr.replace(new RegExp(`(\\d+)${sym}`), (_, d) => String(parseInt(d) + val));
    amtStr = amtStr.replace(sym, String(val));
  }
  const amount = amtStr.includes('/')
    ? parseFloat(amtStr.split('/')[0]) / parseFloat(amtStr.split('/')[1])
    : parseFloat(amtStr);
  if (isNaN(amount)) return null;
  const rawUnit = (m[2] ?? '').toLowerCase().replace(/s$/, '');
  const unit = UNIT_CANONICAL[rawUnit] ?? '';
  return { amount, unit };
}

function formatQtySummary(rawInstances: string[]): string {
  const parsed = rawInstances.map(r => parseQty(r));
  const allParsed = parsed.every(p => p !== null);
  if (!allParsed) return `${rawInstances.length}x`;
  const units = [...new Set(parsed.map(p => p!.unit))].filter(Boolean);
  // Mixed units or no recognized unit -- fall back to count
  if (units.length !== 1) return `${rawInstances.length}x`;
  const total = parsed.reduce((sum, p) => sum + p!.amount, 0);
  const rounded = Math.round(total * 4) / 4; // nearest 0.25
  return `~${rounded} ${units[0]}`;
}

interface GroceryItem {
  displayName: string;
  normalized: string;
  rawInstances: string[];
  count: number;
  category: string;
}

interface GroceryListProps {
  plan: MealPlan;
}

export function GroceryList({ plan }: GroceryListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const items = useMemo<GroceryItem[]>(() => {
    const map = new Map<string, GroceryItem>();

    for (const day of DAYS) {
      const d = plan[day];
      if (!d) continue;
      for (const meal of MEALS) {
        const m = d[meal];
        if (!m?.ingredients) continue;
        for (const ing of m.ingredients) {
          const normalized = normalizeIngredient(ing);
          if (!normalized) continue;
          const existing = map.get(normalized);
          if (existing) {
            existing.count++;
            existing.rawInstances.push(ing);
          } else {
            map.set(normalized, {
              displayName: normalized,
              normalized,
              rawInstances: [ing],
              count: 1,
              category: categorize(normalized),
            });
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [plan]);

  const byCategory = useMemo(() => {
    const map: Record<string, GroceryItem[]> = {};
    for (const item of items) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [items]);

  const categoryOrder = ['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry', 'Other'];
  const checkedCount = checked.size;
  const totalCount = items.length;

  function toggleItem(key: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function checkAll() { setChecked(new Set(items.map(i => i.normalized))); }
  function clearAll() { setChecked(new Set()); }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {checkedCount} of {totalCount} items
          </div>
          <div className="h-1.5 w-32 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkAll}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            Check all
          </button>
          <button
            onClick={clearAll}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Categories */}
      {categoryOrder.map(cat => {
        const catItems = byCategory[cat];
        if (!catItems?.length) return null;
        return (
          <div key={cat}>
            <div
              className="text-xs tracking-widest uppercase mb-2 px-1"
              style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}
            >
              {cat}
            </div>
            <div className="space-y-1">
              {catItems.map(item => {
                const isChecked = checked.has(item.normalized);
                const isStaple = item.count >= 4;
                return (
                  <button
                    key={item.normalized}
                    onClick={() => toggleItem(item.normalized)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-left transition-colors"
                    style={{
                      background: isChecked ? 'var(--surface-2)' : 'var(--surface)',
                      border: `1px solid ${isChecked ? 'var(--border)' : 'var(--border)'}`,
                      opacity: isChecked ? 0.5 : 1,
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        border: `1.5px solid ${isChecked ? 'var(--accent)' : 'var(--text-muted)'}`,
                        background: isChecked ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {isChecked && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12" stroke="#fff" strokeWidth={2}>
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    <span
                      className="flex-1 capitalize"
                      style={{ color: 'var(--text)', textDecoration: isChecked ? 'line-through' : 'none' }}
                    >
                      {item.displayName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isStaple && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem' }}
                        >
                          STAPLE
                        </span>
                      )}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}
                      >
                        {formatQtySummary(item.rawInstances)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
