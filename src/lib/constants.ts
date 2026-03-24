// Shared constants used across components, API routes, and lib modules
import type { DayName } from './types';

export const DAYS: DayName[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = typeof MEALS[number];

// Non-repeating loading messages — long enough to cover a 40s LLM call at 2.5s each
export const LOADING_MESSAGES = [
  'Analyzing your nutrition targets...',
  'Cross-referencing USDA price data...',
  'Checking Walmart Worcester prices...',
  'Building your 7-day plan...',
  'Selecting recipes for your goals...',
  'Optimizing for your budget...',
  'Balancing macros across the week...',
  'Planning ingredient reuse to cut waste...',
  'Calculating per-meal costs...',
  'Generating grocery list...',
  'Applying price calibration...',
  'Validating against USDA data...',
  'Finishing up...',
  'Almost ready...',
];
