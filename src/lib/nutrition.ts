// Mifflin-St Jeor TDEE calculator and macro target generator
// Source: Mifflin MD et al. (1990). JADA 90(3):386-390.

import { ActivityLevel, NutritionTarget, UserInputs, WeightGoal } from './types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Mifflin-St Jeor BMR in kcal/day */
function calcBMR(weightLbs: number, heightInches: number, age: number, sex: 'male' | 'female'): number {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/** TDEE in kcal/day */
export function calcTDEE(inputs: Pick<UserInputs, 'weightLbs' | 'heightInches' | 'age' | 'sex' | 'activityLevel'>): number {
  const bmr = calcBMR(inputs.weightLbs, inputs.heightInches, inputs.age, inputs.sex);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[inputs.activityLevel]);
}

/** Calorie target adjusted for weight goal, with a safe minimum floor */
export function calcCalorieTarget(tdee: number, goal: WeightGoal, sex?: 'male' | 'female'): number {
  let cal = tdee;
  if (goal === 'lose') cal = tdee - 500;
  else if (goal === 'gain') cal = tdee + 300;
  // Minimum: 1200 kcal (female) / 1500 kcal (male) -- below these, nutrient deficiencies become likely
  const floor = sex === 'female' ? 1200 : 1500;
  return Math.round(Math.max(cal, floor));
}

/** Macro targets in grams based on calorie goal */
export function calcMacros(calories: number, goal: WeightGoal, weightLbs?: number): NutritionTarget {
  // Lose: higher protein to preserve muscle (30% cal)
  // Maintain/Gain: balanced (25% cal)
  const proteinPct = goal === 'lose' ? 0.30 : 0.25;
  const fatPct = 0.30;
  const carbPct = 1 - proteinPct - fatPct;

  let proteinG = Math.round((calories * proteinPct) / 4);
  // Floor: 0.7g per lb bodyweight -- standard muscle-preservation minimum
  if (weightLbs) proteinG = Math.max(proteinG, Math.round(weightLbs * 0.7));

  const fatG = Math.round((calories * fatPct) / 9);
  const carbsG = Math.round((calories * carbPct) / 4);

  return { calories, proteinG, carbsG, fatG };
}

/** Compute full NutritionTarget from UserInputs */
export function calcNutritionTarget(inputs: UserInputs): NutritionTarget {
  const tdee = calcTDEE(inputs);
  const calories = calcCalorieTarget(tdee, inputs.goal, inputs.sex);
  return calcMacros(calories, inputs.goal, inputs.weightLbs);
}
