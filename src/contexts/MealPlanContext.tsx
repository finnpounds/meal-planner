'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { GeneratePlanResponse, UserInputs } from '@/lib/types';

interface MealPlanContextValue {
  result: GeneratePlanResponse | null;
  setResult: (r: GeneratePlanResponse | null) => void;
  lastInputs: UserInputs | null;
  setLastInputs: (inputs: UserInputs | null) => void;
}

const MealPlanContext = createContext<MealPlanContextValue | null>(null);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<GeneratePlanResponse | null>(null);
  const [lastInputs, setLastInputs] = useState<UserInputs | null>(null);

  return (
    <MealPlanContext.Provider value={{ result, setResult, lastInputs, setLastInputs }}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const ctx = useContext(MealPlanContext);
  if (!ctx) throw new Error('useMealPlan must be used within MealPlanProvider');
  return ctx;
}
