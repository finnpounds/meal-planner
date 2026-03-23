# CLAUDE.md — Project Rules for AI Meal Planner

## Project Overview

AI-powered weekly meal planner with budget estimation, nutritional targeting, and grocery list generation. Built as a Next.js app with Groq LLM integration, USDA/BLS price data injected into the LLM prompt, and optional Spoonacular nutritional validation. Deployed on Vercel.

**Owner:** Finn (Northeastern MSAIA student)
**Timeline:** 2 weeks
**Class:** ALY6080 Integrated Experiential Learning

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **LLM:** Groq API (Llama 3.3 70B, free tier, OpenAI-compatible)
- **Recipe/Nutrition API:** Spoonacular (free tier, 150 requests/day, nutrition validation only)
- **Price Data:** Static USDA ERS / BLS CPI data injected into LLM prompt + validation layer
- **Hosting:** Vercel (free hobby tier)
- **Package Manager:** pnpm

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes. Do not over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Do not ask for hand-holding
- Point at logs, errors, failing tests, then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First:** Write plan to tasks/todo.md with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to tasks/todo.md
6. **Capture Lessons:** Update tasks/lessons.md after corrections

---

## Core Principles

- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Only touch what is necessary. No side effects with new bugs.
- **Simplicity First:** Make every change as simple as possible. Impact minimal code.

---

## Coding Standards

- All components use TypeScript with strict mode
- Use server components by default; add "use client" only when needed
- API keys live in .env.local, never committed
- API routes go in app/api/ and proxy all external calls (Groq, Spoonacular)
- Price lookup module (lib/priceLookup.ts) is the single source for cost estimation
- Price data is injected into the LLM prompt via data/price_table_prompt.txt; priceLookup.ts validates after generation
- Write APA-style comments in data attribution (source, year, URL)
- No em-dashes in comments or UI copy
- Error states must be visible to the user, not silent failures
- All LLM prompts request JSON output with explicit schema definitions

## File Structure Convention

```
src/
  app/
    page.tsx                 # Input form (budget, biometrics, prefs)
    plan/page.tsx            # Meal plan viewer + grocery list
    api/
      generate-plan/route.ts # Groq LLM proxy (injects price table)
  components/
    InputForm.tsx
    MealCard.tsx
    GroceryList.tsx
    DayTabs.tsx
    MacroRing.tsx
    WeeklySummary.tsx
  lib/
    priceLookup.ts           # Post-generation cost validation
    groq.ts                  # Groq client wrapper
    nutrition.ts             # TDEE / macro calculations
    types.ts                 # Shared TypeScript interfaces
  data/
    price_table_prompt.txt   # Compressed 136-item price table for LLM injection
    grocery_price_lookup.json # Full 215-item data for validation
tasks/
  todo.md
  lessons.md
```

## Environment Variables

```
GROQ_API_KEY=gsk_...
SPOONACULAR_API_KEY=...
```

## Price Data Architecture

The app injects a compressed USDA/BLS price table (~850 tokens) directly into the Groq system prompt. This means the LLM generates meal plans with costs already grounded in federal data in a single pass, with no post-processing price correction needed.

**Data flow:**
```
User inputs
    |
Groq system prompt (includes price_table_prompt.txt as context)
    |
LLM generates meal plan with real prices baked in
    |
priceLookup.ts validates costs (flags >20% deviation as a quality metric)
    |
Spoonacular validates nutrition (optional enrichment, 150 req/day)
    |
Display
```

**Price table source file:** `data/price_table_prompt.txt`
- 136 items across 11 categories
- Every price from USDA ERS 2023 or BLS CPI Feb 2026 (plus static estimates for seafood, pantry, herbs)
- Loaded at build time, injected into system prompt as plain text
- ~842 tokens, negligible on Groq free tier

**Spoonacular role:** Nutritional validation only. Do NOT use Spoonacular for price data. Save the 150 req/day budget for verifying macro estimates on generated recipes.

**priceLookup.ts role:** Post-generation validation layer. After the LLM returns a plan, spot-check ingredient costs against the lookup. Flag items where LLM cost deviates >20% from lookup. This provides a data quality metric for the class presentation.

## Key Constraints

- Spoonacular free tier: 150 requests/day. Use for nutrition validation, NOT pricing. Cache aggressively.
- Groq free tier: 1,000 requests/day, 6,000 tokens/min. One plan generation is ~1 request with ~850 token price table overhead.
- LLM output must be valid JSON. Always include fallback parsing with error handling.
- The price lookup JSON has 215 items. The priceLookup module adds ~60 more via static fallbacks.
- All prices must trace to a source (USDA ERS 2023, BLS CPI Feb 2026, or "static estimate").
