// Shared TypeScript interfaces for the AI Meal Planner

export interface UserInputs {
  budget: number;
  age: number;
  sex: 'male' | 'female';
  weightLbs: number;
  heightInches: number;
  activityLevel: ActivityLevel;
  goal: WeightGoal;
  dietaryPrefs: string[];
  specialRequests: string;
}

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface NutritionTarget {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Meal {
  name: string;
  description: string;
  ingredients: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
  // Optional enrichment fields -- absent in older session data
  instructions?: string[];
  cookTimeMinutes?: number;
  servings?: number;
}

export interface DayPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
}

export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type MealPlan = Record<DayName, DayPlan>;

export interface PriceEntry {
  price: number;
  unit: string;
  category?: string;
  source?: string;
}

export interface ValidationResult {
  totalIngredients: number;
  validatedCount: number;
  deviations: Array<{
    ingredient: string;
    llmCost: number;
    lookupCost: number;
    deviationPct: number;
  }>;
  score: number; // 0-100, percent within 20% threshold
  dietaryViolations?: Array<{
    day: string;
    mealType: string;
    mealName: string;
    ingredient: string;
    restriction: string;
  }>;
}

export interface GeneratePlanResponse {
  plan: MealPlan;
  validation: ValidationResult;
  nutritionTarget: NutritionTarget;
}

export interface GenerateMealResponse {
  meal: Meal;
}
