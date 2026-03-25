# Lessons Learned — AI Meal Planner

## Setup

**L001 — create-next-app rejects directories with capital letters**
Directory name "meal-planner-testsV2" contains a capital V, which violates npm naming restrictions.
Fix: scaffold in a temp dir, copy config files over, set package name manually in package.json.

## Architecture

**L002 — Validate before calibrate, not after**
`validatePlanCosts()` must run on raw LLM costs before `calibrateCosts()` applies the 1.25x multiplier.
Running validation post-calibration inflates the apparent deviation and produces misleading scores.

**L003 — Two independent price estimators will never agree perfectly**
The LLM uses the injected prompt table (~136 items, per-use pantry costs baked in).
priceLookup.ts uses the BLS/USDA JSON (~215 items, container prices converted on the fly).
A 30% per-meal threshold is appropriate; 20% is too tight for two independent estimators.
Replace "% validated" with total cost agreement (LLM vs lookup weekly totals) for cleaner UX.

**L004 — Cup-to-weight conversion needs per-ingredient density**
Generic `LB['cup'] = 0.5 lb` massively overestimates leafy greens:
- Spinach: 0.062 lb/cup (actual) vs 0.5 (generic) = 8x overestimate
- Broccoli: 0.198 lb/cup vs 0.5 = 2.5x overestimate
Use a VOLUME_DENSITY map keyed by ingredient name for produce.

## Bugs

**L005 — FIXED unit block must not inherit bottle price for small units**
Old code: `const p = info.unit?.includes('bottle') ? FIXED[u] : info.price`
This returned the full $8.50 bottle price for "1 tbsp olive oil".
Fix: `const p = info.unit?.includes(u) ? info.price : FIXED[u]`
Only inherit lookup price when the lookup unit directly matches the query unit.

**L006 — Unicode fraction parsing must handle mixed whole+fraction before standalone**
`"1½".replace("½", "0.5")` produces `"10.5"` instead of `"1.5"`.
Fix: replace `(\d+)½` pattern first (combined), then standalone `½`.
Apply this order in both priceLookup.ts and GroceryList.tsx.

**L007 — Nested <button> causes hydration error and React warning**
MealCard had a swap <button> nested inside an expand <button>.
Fix: convert outer expand trigger to a <div role="button"> so the swap button is not nested.

**L008 — IIFEs in JSX cause hydration mismatches**
`{(() => { ... })()}` inside JSX can produce different evaluation order between SSR and client.
Fix: compute the value as a variable before the return statement, then reference it in JSX.
