// Groq API client using native fetch (OpenAI-compatible endpoint)
// Model: llama-3.3-70b-versatile (Groq free tier, 1,000 req/day, 6,000 tokens/min)
// APA: Groq. (2024). GroqCloud documentation. https://console.groq.com/docs/openai

import fs from 'fs';
import path from 'path';

// Read price table once at module load (server-side only)
const priceTablePath = path.join(process.cwd(), 'src/data/price_table_prompt.txt');
const priceTable = fs.readFileSync(priceTablePath, 'utf-8');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export function buildSystemPrompt(): string {
  return `You are a professional nutritionist and budget meal planner.

${priceTable}

When creating recipes, use the prices above to calculate ingredient costs. If an ingredient is not listed, estimate conservatively based on similar items.

Generate a 7-day meal plan as valid JSON. RESPOND WITH ONLY VALID JSON. No markdown, no backticks, no explanation.

The JSON structure must be exactly:
{
  "Monday": {
    "breakfast": {
      "name": "...",
      "description": "2-3 sentence cooking instructions",
      "ingredients": ["1 cup oats", "1 banana", "1 tbsp honey"],
      "calories": 350,
      "protein": 12,
      "carbs": 55,
      "fat": 8,
      "cost": 1.85
    },
    "lunch": { "name": "...", "description": "...", "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cost": 0 },
    "dinner": { "name": "...", "description": "...", "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cost": 0 },
    "snack": { "name": "...", "description": "...", "ingredients": [], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "cost": 0 }
  },
  "Tuesday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Wednesday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Thursday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Friday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Saturday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} },
  "Sunday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snack": {} }
}

Rules:
- Ingredients MUST include quantities with units (e.g., "2 lbs chicken breast", "1 can black beans", "3 eggs")
- Cost is the per-serving ingredient cost in USD, calculated from the price table above
- Macros are in grams, calories in kcal
- Reuse ingredients across the week to reduce waste and stay under budget
- Prefer whole foods and recipes under 30 minutes for weekday meals`;
}

/** Call Groq via raw fetch with retry on 429/500 (max 2 retries) */
export async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
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
          max_tokens: 8000,
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

export { priceTable };
