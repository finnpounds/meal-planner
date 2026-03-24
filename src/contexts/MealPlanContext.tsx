'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { GeneratePlanResponse, UserInputs } from '@/lib/types';

const RESULT_KEY = 'mealPlanResult';
const INPUTS_KEY = 'mealPlanInputs';

interface MealPlanContextValue {
  result: GeneratePlanResponse | null;
  setResult: (r: GeneratePlanResponse | null) => void;
  lastInputs: UserInputs | null;
  setLastInputs: (inputs: UserInputs | null) => void;
}

const MealPlanContext = createContext<MealPlanContextValue | null>(null);

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<GeneratePlanResponse | null>(null);
  const [lastInputs, setLastInputsState] = useState<UserInputs | null>(null);

  // Rehydrate from sessionStorage on mount (survives refresh, cleared on tab close)
  useEffect(() => {
    try {
      const r = sessionStorage.getItem(RESULT_KEY);
      const i = sessionStorage.getItem(INPUTS_KEY);
      if (r) setResultState(JSON.parse(r) as GeneratePlanResponse);
      if (i) setLastInputsState(JSON.parse(i) as UserInputs);
    } catch {
      // Corrupt storage — ignore
    }
  }, []);

  function setResult(r: GeneratePlanResponse | null) {
    setResultState(r);
    try {
      if (r) sessionStorage.setItem(RESULT_KEY, JSON.stringify(r));
      else sessionStorage.removeItem(RESULT_KEY);
    } catch {}
  }

  function setLastInputs(inputs: UserInputs | null) {
    setLastInputsState(inputs);
    try {
      if (inputs) sessionStorage.setItem(INPUTS_KEY, JSON.stringify(inputs));
      else sessionStorage.removeItem(INPUTS_KEY);
    } catch {}
  }

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
