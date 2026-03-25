// Groq API client using native fetch (OpenAI-compatible endpoint)
// Model: llama-3.3-70b-versatile (Groq free tier, 1,000 req/day, 6,000 tokens/min)
// APA: Groq. (2024). GroqCloud documentation. https://console.groq.com/docs/openai

import { buildPricePrompt } from './buildPricePrompt';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export function buildSystemPrompt(): string {
  return `You are a professional nutritionist and budget meal planner.

${buildPricePrompt()}

When creating recipes, use the prices above to calculate ingredient costs. Prefer LOCAL prices when available for more accurate budget estimates. If an ingredient is not listed in either price source, estimate conservatively based on similar items.

Generate a 7-day meal plan as valid JSON. RESPOND WITH ONLY VALID JSON. No markdown, no backticks, no explanation.

The JSON structure must be exactly:
{
  "Monday": {
    "breakfast": {
      "name": "...",
      "description": "One sentence overview of the dish",
      "instructions": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
      "cookTimeMinutes": 15,
      "ingredients": ["1 cup oats", "1 banana", "1 tbsp honey"],
      "calories": 350,
      "protein": 12,
      "carbs": 55,
      "fat": 8,
      "cost": 1.85
    },
    "lunch": { "name": "...", "description": "...", "instructions": [], "cookTimeMinutes": 0, "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cost": 0 },
    "dinner": { "name": "...", "description": "...", "instructions": [], "cookTimeMinutes": 0, "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cost": 0 },
    "snack": { "name": "...", "description": "...", "instructions": [], "cookTimeMinutes": 0, "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cost": 0 }
  },
  "Tuesday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Wednesday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Thursday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Friday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Saturday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Sunday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} }
}

Rules:
- description: one sentence overview of the dish (not instructions)
- instructions: array of 3-5 imperative cooking steps ("Heat oil in pan...", "Add chicken...")
- cookTimeMinutes: realistic total prep + cook time as an integer
- Ingredients MUST include quantities with units (e.g., "6 oz chicken breast", "1 can black beans", "2 eggs")
- Use realistic adult portion sizes: 5-8 oz for proteins, 1 cup for grains/legumes, 1-2 cups for vegetables
- ALWAYS include cooking fat (e.g., "1 tbsp olive oil" or "1 tbsp butter") in every cooked recipe
- ALWAYS include at least 3 seasonings or aromatics per savory recipe (e.g., "1 tsp garlic powder", "0.5 tsp cumin", "1 clove garlic")
- cost is the total ingredient cost in USD for one serving of this meal, using the per-use prices above for oils and spices
- Include ALL ingredients in the cost — protein, produce, grains, AND cooking fat and seasonings
- Macros are in grams, calories in kcal
- Reuse ingredients across the week to reduce waste and stay under budget
- Prefer whole foods and recipes under 30 minutes for weekday meals
- Calorie distribution targets per meal: breakfast ~25%, lunch ~30%, dinner ~35%, snack ~10% of daily total`;
}

/** Build user prompt for generating a single replacement meal */
export function buildSingleMealUserPrompt(
  mealType: string,
  dailyCalories: number,
  dailyProtein: number,
  dailyCarbs: number,
  dailyFat: number,
  weeklyBudget: number,
  dietaryPrefs: string[],
  existingMealNames: string[],
  specialRequests?: string
): string {
  const MEAL_PCT: Record<string, number> = { breakfast: 0.25, lunch: 0.30, dinner: 0.35, snack: 0.10 };
  const pct = MEAL_PCT[mealType] ?? 0.25;
  const mealCals = Math.round(dailyCalories * pct);
  const mealProtein = Math.round(dailyProtein * pct);
  const mealCarbs = Math.round(dailyCarbs * pct);
  const mealFat = Math.round(dailyFat * pct);
  const mealBudget = (weeklyBudget / 21).toFixed(2);
  const prefStr = dietaryPrefs.length > 0 ? dietaryPrefs.join(', ') : 'No restrictions';
  const avoidStr = existingMealNames.length > 0
    ? `\n- Do NOT repeat any of these meals already in the plan: ${existingMealNames.join(', ')}`
    : '';

  return `Generate a single ${mealType} meal meeting these requirements:

- Calorie target: ~${mealCals} kcal (${Math.round(pct * 100)}% of ${dailyCalories} daily kcal)
- Macro targets: ~${mealProtein}g protein, ${mealCarbs}g carbs, ${mealFat}g fat
- Cost: under $${mealBudget}
- Dietary preferences: ${prefStr}${avoidStr}
${specialRequests ? `- Special requests: ${specialRequests}` : ''}

Return ONLY a single JSON meal object. No markdown, no wrapper object:
{
  "name": "...",
  "description": "One sentence overview",
  "instructions": ["Step 1...", "Step 2...", "Step 3..."],
  "cookTimeMinutes": 20,
  "ingredients": ["qty unit ingredient", ...],
  "calories": ${mealCals},
  "protein": ${mealProtein},
  "carbs": ${mealCarbs},
  "fat": ${mealFat},
  "cost": 0.00
}`
}

/** Call Groq via raw fetch with retry on 429/500 (max 2 retries) */
export async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 8000): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      });

      if (res.status === 429 || res.status === 500) {
        lastError = new Error(`Groq returned ${res.status}`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq ${res.status}: ${body}`);
      }

      const data = await res.json() as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message?.content ?? '';
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  throw lastError ?? new Error('Groq API call failed');
}

/** Parse JSON from LLM response, with regex fallback for wrapped JSON */
export function parseJSON<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim()) as T;
      } catch {
        // fall through
      }
    }
    const objMatch = trimmed.match(/\{[\s\S]+\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]) as T;
    }
    throw new Error('Could not parse JSON from LLM response');
  }
}

