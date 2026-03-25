# Meal Planner — Build Tasks

## Status: Complete

All phases built and shipped.

### What was built
- Next.js 14 App Router + TypeScript + Tailwind CSS v4
- Groq API integration (llama-3.3-70b-versatile) with price table injection
- Mifflin-St Jeor TDEE with calorie/protein floors
- priceLookup.ts: fuzzy price validation against USDA ERS 2023 / BLS CPI Feb 2026
- Input form with TDEE preview, dietary prefs, budget warning
- Plan view: day tabs, expandable meal cards with macros + instructions + swap
- Grocery list: deduplicated, categorized, quantity-summed, checkbox
- WeeklySummary: budget bar, macro stats, $/1000 kcal, $/g protein, cost estimate agreement

### Remaining
- [ ] Deploy to Vercel
