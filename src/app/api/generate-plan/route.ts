// POST /api/generate-plan
// Accepts UserInputs, builds Groq prompt with injected price table, returns MealPlan + validation

import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt, callGroq, parseJSON } from '@/lib/groq';
import { calcNutritionTarget } from '@/lib/nutrition';
import { estimateIngredientCost } from '@/lib/priceLookup';
import type { GeneratePlanResponse, MealPlan, UserInputs, ValidationResult, DayName } from '@/lib/types';

const DAYS: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

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

      totalIngredients++;
      if (lookupMealCost > 0) {
        const deviationPct = Math.abs(llmMealCost - lookupMealCost) / lookupMealCost * 100;
        if (deviationPct <= 20) {
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
  return { totalIngredients, validatedCount, deviations, score };
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

  const validation = validatePlanCosts(plan);

  const response: GeneratePlanResponse = {
    plan,
    validation,
    nutritionTarget: nutrition,
  };

  return NextResponse.json(response);
}
