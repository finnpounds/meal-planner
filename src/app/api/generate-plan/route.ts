// POST /api/generate-plan
// Accepts UserInputs, builds Groq prompt with injected price table, returns MealPlan + validation

export const maxDuration = 60; // Vercel hobby tier max: 60s

import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt, callGroq, parseJSON } from '@/lib/groq';
import { calcNutritionTarget } from '@/lib/nutrition';
import { estimateIngredientCost } from '@/lib/priceLookup';
import type { GeneratePlanResponse, MealPlan, UserInputs, ValidationResult } from '@/lib/types';
import { DAYS, MEALS } from '@/lib/constants';

// Pantry overhead per cooked meal: accounts for salt, pepper, oil, spices not explicitly listed
const PANTRY_OVERHEAD = 0.60;
// Calibration multiplier: LLMs systematically undershoot real grocery costs ~20-25%
const COST_CALIBRATION = 1.25;

/** Apply pantry overhead and calibration multiplier to all meal costs in-place */
function calibrateCosts(plan: MealPlan): void {
  for (const day of DAYS) {
    const dayPlan = plan[day];
    if (!dayPlan) continue;
    for (const meal of MEALS) {
      const m = dayPlan[meal];
      if (!m) continue;
      const isSnack = meal === 'snack';
      const overhead = isSnack ? PANTRY_OVERHEAD * 0.25 : PANTRY_OVERHEAD;
      m.cost = Math.round((m.cost * COST_CALIBRATION + overhead) * 100) / 100;
    }
  }
}

function buildUserPrompt(inputs: UserInputs, calories: number, protein: number, carbs: number, fat: number): string {
  const prefStr = inputs.dietaryPrefs.length > 0 ? inputs.dietaryPrefs.join(', ') : 'No restrictions';
  const goalLabel = inputs.goal === 'lose' ? 'weight loss' : inputs.goal === 'gain' ? 'muscle gain' : 'weight maintenance';

  return `Create a 7-day meal plan with the following requirements:

- Weekly grocery budget: $${inputs.budget}
- Daily calorie target: ${calories} kcal (for ${goalLabel})
- Daily macro targets: ${protein}g protein, ${carbs}g carbs, ${fat}g fat
- Dietary preferences: ${prefStr}
- Activity level: ${inputs.activityLevel.replace('_', ' ')}
${inputs.specialRequests ? `- Special requests: ${inputs.specialRequests}` : ''}

Keep total weekly grocery cost under $${inputs.budget}. Reuse ingredients across meals to minimize waste.

Return ONLY the JSON meal plan. No text before or after.`;
}

/** Run cost validation: compare LLM-reported costs to priceLookup estimates */
function validatePlanCosts(plan: MealPlan): ValidationResult {
  const deviations: ValidationResult['deviations'] = [];
  let totalIngredients = 0;
  let validatedCount = 0;
  let llmWeeklyTotal = 0;
  let lookupWeeklyTotal = 0;

  for (const day of DAYS) {
    const dayPlan = plan[day];
    if (!dayPlan) continue;
    for (const meal of MEALS) {
      const mealData = dayPlan[meal];
      if (!mealData?.ingredients?.length) continue;

      const llmMealCost = mealData.cost ?? 0;
      const lookupMealCost = mealData.ingredients.reduce(
        (sum, ing) => sum + estimateIngredientCost(ing),
        0
      );

      llmWeeklyTotal += llmMealCost;
      if (lookupMealCost > 0) lookupWeeklyTotal += lookupMealCost;

      totalIngredients++;
      if (lookupMealCost > 0) {
        const deviationPct = Math.abs(llmMealCost - lookupMealCost) / lookupMealCost * 100;
        if (deviationPct <= 30) {
          validatedCount++;
        } else {
          deviations.push({
            ingredient: `${day} ${meal}`,
            llmCost: Math.round(llmMealCost * 100) / 100,
            lookupCost: Math.round(lookupMealCost * 100) / 100,
            deviationPct: Math.round(deviationPct),
          });
        }
      } else {
        // No lookup available -- count as validated to not penalize
        validatedCount++;
      }
    }
  }

  const score = totalIngredients > 0 ? Math.round((validatedCount / totalIngredients) * 100) : 0;
  return {
    totalIngredients, validatedCount, deviations, score,
    llmWeeklyTotal: Math.round(llmWeeklyTotal * 100) / 100,
    lookupWeeklyTotal: Math.round(lookupWeeklyTotal * 100) / 100,
  };
}

// Keyword map for dietary restriction violation detection
// Keywords use word-boundary matching to avoid false positives (e.g., "egg" vs "eggplant")
const DIETARY_KEYWORDS: Record<string, string[]> = {
  'Vegetarian': ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna', 'shrimp', 'tilapia', 'cod', 'lamb', 'bacon', 'ham', 'sausage', 'anchov', 'pepperoni', 'prosciutto', 'lard', 'gelatin', 'worcestershire'],
  'Vegan': ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna', 'shrimp', 'tilapia', 'cod', 'lamb', 'bacon', 'ham', 'sausage', 'egg', 'milk', 'butter', 'cheese', 'yogurt', 'cream', 'honey', 'whey', 'casein', 'ghee'],
  'Gluten-Free': ['wheat', 'flour', 'bread', 'pasta', 'spaghetti', 'noodle', 'flour tortilla', 'cracker', 'barley', 'rye', 'couscous', 'seitan', 'soy sauce', 'panko', 'breadcrumb'],
  'Dairy-Free': ['milk', 'butter', 'cheese', 'yogurt', 'cream', 'mozzarella', 'parmesan', 'feta', 'cheddar', 'cottage', 'sour cream', 'ghee', 'whey', 'casein', 'lactose'],
  'Nut-Free': ['almond', 'walnut', 'cashew', 'pecan', 'peanut', 'pistachio', 'hazelnut', 'macadamia', 'pine nut', 'nut butter', 'tahini'],
};

// Compound strings that contain a keyword but are NOT violations
const FALSE_POSITIVE_CONTEXTS: Record<string, string[]> = {
  'egg':      ['eggplant', 'egg noodle'],
  'ham':      ['hamburger'],
  'milk':     ['coconut milk', 'oat milk', 'almond milk', 'soy milk', 'cashew milk', 'rice milk', 'hemp milk', 'macadamia milk'],
  'butter':   ['almond butter', 'peanut butter', 'cashew butter', 'nut butter', 'seed butter', 'cocoa butter'],
  'cream':    ['coconut cream', 'cream of tartar'],
  'tortilla': ['corn tortilla'],
  'flour':    ['rice flour', 'almond flour', 'coconut flour', 'tapioca flour', 'chickpea flour', 'oat flour'],
};

function checkKeywordViolation(lower: string, restriction: string, keywords: string[]): string | undefined {
  return keywords.find(kw => {
    if (!lower.includes(kw)) return false;
    // Exclude known false positive compound strings (e.g. "eggplant" for "egg")
    const falseContexts = FALSE_POSITIVE_CONTEXTS[kw] ?? [];
    if (falseContexts.some(ctx => lower.includes(ctx))) return false;
    return true;
  });
}

function validateDietaryRestrictions(
  plan: MealPlan,
  dietaryPrefs: string[]
): NonNullable<ValidationResult['dietaryViolations']> {
  const violations: NonNullable<ValidationResult['dietaryViolations']> = [];
  const activeRestrictions = dietaryPrefs.filter(p => p in DIETARY_KEYWORDS);
  if (activeRestrictions.length === 0) return violations;

  for (const day of DAYS) {
    const d = plan[day];
    if (!d) continue;
    for (const meal of MEALS) {
      const m = d[meal];
      if (!m?.ingredients?.length) continue;
      for (const restriction of activeRestrictions) {
        const keywords = DIETARY_KEYWORDS[restriction];
        for (const ing of m.ingredients) {
          const lower = ing.toLowerCase();
          const matched = checkKeywordViolation(lower, restriction, keywords);
          if (matched) {
            violations.push({ day, mealType: meal, mealName: m.name, ingredient: ing, restriction });
          }
        }
      }
    }
  }
  return violations;
}

/** Validate that the parsed plan has the expected shape */
function validatePlanShape(plan: unknown): plan is MealPlan {
  if (typeof plan !== 'object' || plan === null) return false;
  for (const day of DAYS) {
    const d = (plan as Record<string, unknown>)[day];
    if (typeof d !== 'object' || d === null) return false;
    for (const meal of MEALS) {
      const m = (d as Record<string, unknown>)[meal];
      if (typeof m !== 'object' || m === null) return false;
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  let inputs: UserInputs;
  try {
    inputs = (await req.json()) as UserInputs;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!inputs.budget || !inputs.age || !inputs.sex || !inputs.weightLbs || !inputs.heightInches) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const nutrition = calcNutritionTarget(inputs);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(inputs, nutrition.calories, nutrition.proteinG, nutrition.carbsG, nutrition.fatG);

  let raw: string;
  try {
    raw = await callGroq(systemPrompt, userPrompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LLM request failed';
    return NextResponse.json({ error: `Groq API error: ${msg}` }, { status: 502 });
  }

  let plan: MealPlan;
  try {
    const parsed = parseJSON<unknown>(raw);
    if (!validatePlanShape(parsed)) {
      return NextResponse.json({ error: 'LLM returned invalid plan structure' }, { status: 502 });
    }
    plan = parsed;
  } catch {
    return NextResponse.json({ error: 'Could not parse meal plan JSON from LLM response' }, { status: 502 });
  }

  // Validate raw LLM costs BEFORE calibration -- measures LLM accuracy, not our post-processed number
  const validation = validatePlanCosts(plan);
  // Scan for dietary restriction violations on raw plan
  const dietaryViolations = validateDietaryRestrictions(plan, inputs.dietaryPrefs);
  if (dietaryViolations.length > 0) validation.dietaryViolations = dietaryViolations;
  calibrateCosts(plan);

  const response: GeneratePlanResponse = {
    plan,
    validation,
    nutritionTarget: nutrition,
  };

  return NextResponse.json(response);
}
