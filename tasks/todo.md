# Meal Planner — Build Tasks

## Phase 1: Scaffold
- [x] Initialize Next.js 14 with TypeScript, Tailwind, App Router, src-dir
- [x] Create directory structure (src/app, src/lib, src/data, src/components, src/contexts, tasks/)
- [x] Copy price_table_prompt.txt and grocery_price_lookup.json to src/data/
- [x] Create tasks/todo.md and tasks/lessons.md
- [x] Create .env.local with placeholder keys
- [x] Install openai package

## Phase 2: Core Logic
- [x] src/lib/types.ts — shared TypeScript interfaces
- [x] src/lib/nutrition.ts — Mifflin-St Jeor TDEE + macro splits
- [x] src/lib/priceLookup.ts — convert priceLookup.js to TypeScript
- [x] src/lib/groq.ts — Groq client via OpenAI SDK
- [x] src/app/api/generate-plan/route.ts — POST endpoint with price table injection

## Phase 3: Input Page UI
- [x] src/contexts/MealPlanContext.tsx — React context for plan state
- [x] src/app/globals.css — dark theme, font imports
- [x] src/app/layout.tsx — root layout with context provider
- [x] src/app/page.tsx — full input form

## Phase 4: Plan View UI
- [x] src/components/DayTabs.tsx — Mon-Sun pill selector
- [x] src/components/MacroRing.tsx — SVG ring chart
- [x] src/components/MealCard.tsx — expandable meal card
- [x] src/components/WeeklySummary.tsx — weekly stats bar
- [x] src/components/GroceryList.tsx — deduplicated checkbox list
- [x] src/app/plan/page.tsx — two-tab plan view

## Phase 5: Cost Validation
- [x] validatePlanCosts() in API route
- [x] Validation score in API response
- [x] Score displayed in WeeklySummary

## Phase 6: Polish
- [x] Loading states with spinner + rotating messages
- [x] Error boundary with retry button
- [x] Mobile responsive (375px)

## Review
- [ ] End-to-end verification
- [ ] Deploy to Vercel
