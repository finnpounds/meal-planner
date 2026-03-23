# Claude Code Plan Mode Prompt — AI Meal Planner

Copy everything below the line and paste it into Claude Code with plan mode active.

---

I am building an AI-powered weekly meal planner web app as a class project. Read CLAUDE.md first for full project rules, workflow orchestration, and coding standards. Then execute the plan below.

### What this app does

A user enters their weekly grocery budget, body stats (height, weight, age, sex), activity level, dietary preferences, a weight goal (lose/maintain/gain), and optional special requests. The app generates a 7-day meal plan (breakfast, lunch, dinner, snack) optimized for their calorie target and budget. Each meal shows ingredients, macros, and estimated cost. A grocery list tab aggregates and deduplicates all ingredients across the week, categorized by store aisle, with checkboxes.

### Key architectural decision: price table in the prompt

Instead of post-processing LLM prices with a separate lookup, we inject a compressed 136-item USDA/BLS price table (~850 tokens) directly into the Groq system prompt. The LLM generates plans with costs already grounded in federal data in a single pass. No fallback chains, no rate limit juggling.

```
User inputs
    |
Groq system prompt (includes data/price_table_prompt.txt)
    |
LLM generates meal plan JSON with real prices baked in
    |
priceLookup.ts validates costs (flags >20% deviation)
    |
Display
```

### Architecture

```
Next.js 14 App Router + TypeScript + Tailwind CSS
├── app/
│   ├── page.tsx                 # Input form (budget, biometrics, prefs)
│   ├── plan/page.tsx            # Meal plan viewer + grocery list
│   └── api/
│       └── generate-plan/route.ts   # Groq LLM proxy (injects price table)
├── components/
│   ├── InputForm.tsx
│   ├── MealCard.tsx
│   ├── GroceryList.tsx
│   ├── DayTabs.tsx
│   ├── MacroRing.tsx
│   └── WeeklySummary.tsx
├── lib/
│   ├── priceLookup.ts           # Post-generation cost validation
│   ├── groq.ts                  # Groq client wrapper
│   ├── nutrition.ts             # TDEE / macro calculations
│   └── types.ts                 # Shared TypeScript interfaces
├── data/
│   ├── price_table_prompt.txt   # Compressed price table for LLM injection
│   └── grocery_price_lookup.json # Full 215-item data for validation
└── tasks/
    ├── todo.md
    └── lessons.md
```

### Data files already created

I have these files ready to drop into the project:

1. **price_table_prompt.txt** — 136-item compressed price table organized by category (Fruit, Vegetables, Beans, Meat, Seafood, Dairy, Grains, Pantry, Herbs, Plant Protein). Plain text, ~850 tokens. Gets injected into the Groq system prompt at request time. Read this file at build time with `fs.readFileSync()` in the API route.

2. **grocery_price_lookup.json** — Full 215-item price database for validation. Structure: `{ "_meta": {...}, "prices": { "item name": { "price": number, "unit": string, "category": string, "source": string } } }`

3. **priceLookup.js** — Price lookup module with fuzzy matching, 100+ manual aliases, 60+ static fallback prices. Needs conversion to TypeScript. Role: post-generation validation, NOT primary pricing.

4. **CLAUDE.md** — Project rules, workflow orchestration, coding standards, file structure.

### Implementation plan (execute in order)

**Phase 1: Scaffold**
- [ ] Initialize Next.js project with `npx create-next-app@latest . --typescript --tailwind --app` in the current directory
- [ ] Set up file structure per the architecture above
- [ ] Create tasks/todo.md and tasks/lessons.md
- [ ] Set up .env.local with placeholder keys: GROQ_API_KEY, SPOONACULAR_API_KEY
- [ ] Copy price_table_prompt.txt and grocery_price_lookup.json into data/
- [ ] Convert priceLookup.js to lib/priceLookup.ts with proper types
- [ ] Create lib/types.ts with interfaces: MealPlan, DayPlan, Meal, Ingredient, UserInputs, NutritionTarget
- [ ] STOP and show the file tree before proceeding

**Phase 2: Core logic (no UI yet)**
- [ ] lib/nutrition.ts — Mifflin-St Jeor TDEE calculator, macro split calculator (protein/carbs/fat targets based on goal)
- [ ] lib/groq.ts — Groq API client. Uses OpenAI-compatible endpoint at api.groq.com/openai/v1. Model: llama-3.3-70b-versatile. Includes retry logic (max 2 retries on 429/500), JSON response parsing with fallback regex extraction. The key design: this client reads data/price_table_prompt.txt at initialization and prepends it to every system prompt.
- [ ] app/api/generate-plan/route.ts — POST endpoint. Accepts UserInputs, builds the LLM prompt with budget, calorie target, dietary prefs, and special requests. The system prompt includes the full price table from price_table_prompt.txt. Calls Groq, parses JSON response, validates structure, returns MealPlan. If Groq fails, return a clear error message, not a 500.
- [ ] Verify: hit /api/generate-plan with curl and confirm valid JSON meal plan comes back with prices that match the injected price table

**Phase 3: Input page UI**
- [ ] app/page.tsx — Full input form. Dark theme (bg #141413, text #e8e0d4, accent #6b8f5e). Use Google Fonts: DM Mono (monospace labels), DM Sans (body), Instrument Serif (headings).
- [ ] Sections: weekly budget (number input + quick-select $50/$75/$100/$150 buttons), age/sex/weight/height, activity level (5 buttons: Sedentary through Very Active), weight goal (Lose/Maintain/Gain with calorie preview), dietary preferences (pill toggles: Vegetarian, Vegan, Pescatarian, Keto, Low-Carb, Gluten-Free, Dairy-Free, High-Protein, Mediterranean, No Restrictions), special requests textarea, TDEE/budget summary bar, and Generate button.
- [ ] Use React state for all form fields. Calculate TDEE on the fly as inputs change.
- [ ] On submit: POST to /api/generate-plan, show loading spinner, navigate to /plan on success.
- [ ] Store the plan result in React context (not localStorage).

**Phase 4: Plan view UI**
- [ ] app/plan/page.tsx — Two-tab layout: "Meal Plan" and "Grocery List"
- [ ] Meal Plan tab: day selector (Mon-Sun pill buttons), 4 meal cards per day (Breakfast, Lunch, Dinner, Snack). Each card shows meal name, estimated cost, and expands on click to show: description/instructions, ingredient list, macro rings (protein/carbs/fat as small SVG ring charts), and calorie count.
- [ ] Weekly summary bar at top: total weekly cost vs budget, avg calories/day vs target, avg protein/day.
- [ ] Grocery List tab: aggregate all ingredients across 7 days. Deduplicate by normalizing names (strip quantities/units, lowercase, match fuzzy). Group by category (Produce, Protein, Dairy, Grains, Pantry, Other). Each item shows: checkbox, display name, frequency badge ("used 5x"), items used 4+ times get a "STAPLE" badge. Progress bar showing checked/total. "Check all" and "Clear all" buttons.
- [ ] "Regenerate" button and "Edit Inputs" back button in the header.

**Phase 5: Cost validation layer**
- [ ] After the LLM returns a plan, run each ingredient through priceLookup.ts as a validation pass.
- [ ] If LLM cost for an ingredient deviates >20% from the lookup value, log the discrepancy.
- [ ] Add a small data quality indicator to the weekly summary (e.g., "93% of prices validated against USDA/BLS data").
- [ ] This is for data integrity, not correction. The LLM prices are already grounded by the injected table.

**Phase 6: Polish and deploy**
- [ ] Add proper loading states with animated spinner and rotating status messages
- [ ] Add error boundary that catches LLM failures and shows retry button
- [ ] Mobile responsive: input form and plan view must work on 375px width
- [ ] Verify the full flow end-to-end: fill form, generate plan, view meals, switch days, open grocery list, check items
- [ ] Deploy to Vercel with environment variables
- [ ] Update tasks/todo.md with completion status

### LLM prompt specification

The system prompt for Groq must be structured exactly like this:

```
You are a professional nutritionist and budget meal planner.

[CONTENTS OF data/price_table_prompt.txt INSERTED HERE]

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
    "lunch": { ... },
    "dinner": { ... },
    "snack": { ... }
  },
  "Tuesday": { ... },
  ...through "Sunday"
}

Rules:
- Ingredients MUST include quantities with units (e.g., "2 lbs chicken breast", "1 can black beans", "3 eggs")
- Cost is the per-serving ingredient cost in USD, calculated from the price table above
- Macros are in grams, calories in kcal
- Reuse ingredients across the week to reduce waste and stay under budget
- Prefer whole foods and recipes under 30 minutes for weekday meals
```

The user prompt includes: budget, target calories, dietary preferences, biometric context, activity level, and special requests.

### Key technical decisions

- All API keys stay server-side in route handlers. The client never sees them.
- Groq uses the OpenAI SDK with a custom baseURL. Install `openai` package, not a groq-specific one.
- The price table text file is read with `fs.readFileSync()` at the top of the API route module, not on every request.
- priceLookup.ts imports grocery_price_lookup.json at build time for validation.
- TypeScript strict mode. No `any` types except in JSON parse fallbacks (use `unknown` then validate).
- Tailwind only. No CSS modules, no styled-components.
- Use Google Fonts via next/font or @import in globals.css.
- React context for passing the generated plan from the input page to the plan view.

### What NOT to do

- Do not set up Supabase or any database. Use React context for plan state.
- Do not add authentication. This is a demo.
- Do not use Spoonacular for price data. The price table in the prompt handles pricing.
- Do not create separate CSS files. Everything is Tailwind utility classes.
- Do not use localStorage or sessionStorage for plan data.
- Do not call any external API from the client. Always proxy through API routes.
- Do not add unit tests in this sprint. Manual verification is sufficient.

Start by reading CLAUDE.md, then scaffold the project (Phase 1), then pause and show me the file tree before proceeding to Phase 2.
