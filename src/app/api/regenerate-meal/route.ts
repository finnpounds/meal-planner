// POST /api/regenerate-meal
// Swaps a single meal slot without regenerating the entire 7-day plan
// APA: Groq. (2024). GroqCloud documentation. https://console.groq.com/docs/openai

export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt, buildSingleMealUserPrompt, callGroq, parseJSON } from '@/lib/groq';
import { calcNutritionTarget } from '@/lib/nutrition';
import { estimateRecipeCost } from '@/lib/priceLookup';
import type { GenerateMealResponse, Meal, MealPlan, UserInputs } from '@/lib/types';
import { DAYS, MEALS } from '@/lib/constants';
import type { MealType } from '@/lib/constants';

// Match calibration constants from generate-plan/route.ts to keep costs consistent
const PANTRY_OVERHEAD = 0.60;
const COST_CALIBRATION = 1.25;

interface RegenerateMealRequest {
  mealType: MealType;
  day: string;
  inputs: UserInputs;
  currentPlan: MealPlan;
}

function validateMealShape(obj: unknown): obj is Meal {
  if (typeof obj !== 'object' || obj === null) return false;
  const m = obj as Record<string, unknown>;
  return (
    typeof m.name === 'string' &&
    typeof m.description === 'string' &&
    Array.isArray(m.ingredients) &&
    typeof m.calories === 'number' &&
    typeof m.protein === 'number' &&
    typeof m.carbs === 'number' &&
    typeof m.fat === 'number' &&
    typeof m.cost === 'number'
  );
}

/** Collect all meal names from the current plan, excluding the slot being replaced */
function collectExistingMealNames(plan: MealPlan, excludeDay: string, excludeMealType: MealType): string[] {
  const names: string[] = [];
  for (const day of DAYS) {
    const d = plan[day];
    if (!d) continue;
    for (const meal of MEALS) {
      if (day === excludeDay && meal === excludeMealType) continue;
      const m = d[meal];
      if (m?.name) names.push(m.name);
    }
  }
  return [...new Set(names)];
}

export async function POST(req: NextRequest) {
  let body: RegenerateMealRequest;
  try {
    body = (await req.json()) as RegenerateMealRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { mealType, day, inputs, currentPlan } = body;

  if (!mealType || !inputs || !currentPlan) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!(MEALS as readonly string[]).includes(mealType)) {
    return NextResponse.json({ error: `Invalid mealType: ${mealType}` }, { status: 400 });
  }

  const nutrition = calcNutritionTarget(inputs);
  const existingNames = collectExistingMealNames(currentPlan, day, mealType);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildSingleMealUserPrompt(
    mealType,
    nutrition.calories,
    nutrition.proteinG,
    nutrition.carbsG,
    nutrition.fatG,
    inputs.budget,
    inputs.dietaryPrefs,
    existingNames,
    inputs.specialRequests
  );

  let raw: string;
  try {
    raw = await callGroq(systemPrompt, userPrompt, 800);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LLM request failed';
    return NextResponse.json({ error: `Groq API error: ${msg}` }, { status: 502 });
  }

  let meal: Meal;
  try {
    let parsed = parseJSON<unknown>(raw);
    // Handle case where LLM wraps meal in an outer object (e.g., { "meal": {...} })
    if (parsed && typeof parsed === 'object' && !validateMealShape(parsed)) {
      const wrapped = (parsed as Record<string, unknown>).meal;
      if (wrapped && validateMealShape(wrapped)) parsed = wrapped;
    }
    if (!validateMealShape(parsed)) {
      return NextResponse.json({ error: 'LLM returned invalid meal structure' }, { status: 502 });
    }
    meal = parsed;
  } catch {
    return NextResponse.json({ error: 'Could not parse meal JSON from LLM response' }, { status: 502 });
  }

  // Apply same calibration as generate-plan/route.ts
  const isSnack = mealType === 'snack';
  const overhead = isSnack ? PANTRY_OVERHEAD * 0.25 : PANTRY_OVERHEAD;
  meal.cost = Math.round((meal.cost * COST_CALIBRATION + overhead) * 100) / 100;

  // If lookup cost differs wildly (>50%), replace with lookup-based estimate
  const lookupCost = estimateRecipeCost(meal.ingredients);
  if (lookupCost > 0) {
    const deviationPct = Math.abs(meal.cost - lookupCost) / lookupCost * 100;
    if (deviationPct > 50) {
      meal.cost = Math.round((lookupCost * COST_CALIBRATION + overhead) * 100) / 100;
    }
  }

  const response: GenerateMealResponse = { meal };
  return NextResponse.json(response);
}
