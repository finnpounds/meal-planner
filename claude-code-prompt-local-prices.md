# Claude Code Prompt — Add Local Walmart Price Layer

Paste this into your Claude Code session after the app is scaffolded (Phase 2+).

---

Add a local price override layer to the meal planner. The concept: we prepend real Walmart prices for the user's area to the system prompt, so the LLM prefers local prices for common staples and falls back to the national USDA/BLS averages for everything else.

## Data source

The USA Today Grocery Price Tracker (data.usatoday.com/projects/grocery-prices-tracker/) publishes current Walmart prices by metro area, sourced from Bright Data web scraping. We manually extract these into a local config file. This is cited in the app and report as: "USA Today / Bright Data Walmart price tracker, accessed March 2026."

## Implementation

### 1. Create `data/local_prices.json`

This file holds normalized local prices. It can be updated by hand whenever the user checks the USA Today tracker. Create it with this structure and the following Worcester, MA Walmart data from March 20, 2026:

```json
{
  "_meta": {
    "source": "USA Today Grocery Price Tracker (Bright Data / Walmart)",
    "url": "https://data.usatoday.com/projects/grocery-prices-tracker/",
    "location": "Worcester, MA",
    "store": "Walmart",
    "date_accessed": "2026-03-24",
    "prices_as_of": "2026-03-20"
  },
  "prices": {
    "apples": { "price": 2.38, "unit": "3 lb bag", "price_per_lb": 0.79 },
    "avocados": { "price": 4.17, "unit": "3-4 count", "price_per_each": 1.19 },
    "bananas": { "price": 0.19, "unit": "each", "price_per_lb": 0.58 },
    "ground beef": { "price": 6.26, "unit": "1 lb", "price_per_lb": 6.26 },
    "bread": { "price": 1.48, "unit": "20 oz loaf", "price_per_lb": 1.18 },
    "cheese slices": { "price": 1.67, "unit": "12 slices", "price_per_lb": 3.34 },
    "chicken": { "price": 11.57, "unit": "7 kg", "price_per_lb": 0.75 },
    "coffee": { "price": 6.24, "unit": "12 oz", "price_per_lb": 8.32 },
    "eggs": { "price": 2.96, "unit": "dozen", "price_per_dozen": 2.96 },
    "lettuce iceberg": { "price": 2.18, "unit": "head", "price_per_head": 2.18 },
    "milk whole": { "price": 3.02, "unit": "gallon", "price_per_gallon": 3.02 },
    "potatoes": { "price": 2.47, "unit": "5 lb bag", "price_per_lb": 0.49 },
    "rice white": { "price": 3.37, "unit": "5 lbs", "price_per_lb": 0.67 },
    "spaghetti": { "price": 0.98, "unit": "454g (1 lb)", "price_per_lb": 0.98 },
    "tomato": { "price": 0.22, "unit": "each", "price_per_lb": 0.56 }
  }
}
```

### 2. Create `lib/buildPricePrompt.ts`

This module builds the complete price section for the system prompt by merging local and national data:

```typescript
import fs from 'fs';
import path from 'path';

interface LocalPrice {
  price: number;
  unit: string;
  price_per_lb?: number;
  price_per_dozen?: number;
  price_per_gallon?: number;
  price_per_head?: number;
  price_per_each?: number;
}

interface LocalPriceData {
  _meta: {
    location: string;
    store: string;
    prices_as_of: string;
  };
  prices: Record<string, LocalPrice>;
}

let cachedPrompt: string | null = null;

export function buildPricePrompt(): string {
  if (cachedPrompt) return cachedPrompt;

  // Load national prices (always available)
  const nationalPath = path.join(process.cwd(), 'data', 'price_table_prompt.txt');
  const nationalPrices = fs.readFileSync(nationalPath, 'utf-8');

  // Load local prices (optional)
  const localPath = path.join(process.cwd(), 'data', 'local_prices.json');
  let localSection = '';

  try {
    const localRaw = fs.readFileSync(localPath, 'utf-8');
    const localData: LocalPriceData = JSON.parse(localRaw);
    const meta = localData._meta;

    const items = Object.entries(localData.prices).map(([name, info]) => {
      // Pick the most useful normalized price
      if (info.price_per_lb) return `${name} $${info.price_per_lb.toFixed(2)}/lb`;
      if (info.price_per_dozen) return `${name} $${info.price_per_dozen.toFixed(2)}/doz`;
      if (info.price_per_gallon) return `${name} $${info.price_per_gallon.toFixed(2)}/gal`;
      if (info.price_per_head) return `${name} $${info.price_per_head.toFixed(2)}/head`;
      if (info.price_per_each) return `${name} $${info.price_per_each.toFixed(2)}/each`;
      return `${name} $${info.price.toFixed(2)}/${info.unit}`;
    });

    localSection = `LOCAL WALMART PRICES (${meta.location}, as of ${meta.prices_as_of}):\n${items.join(' | ')}\n\nPrefer local prices above when the ingredient matches. Fall back to national averages below for all other items.\n\n`;
  } catch {
    // No local prices file or invalid JSON — just use national
  }

  cachedPrompt = localSection + nationalPrices;
  return cachedPrompt;
}
```

### 3. Update `lib/groq.ts`

Change the system prompt builder to use `buildPricePrompt()` instead of reading `price_table_prompt.txt` directly:

```typescript
import { buildPricePrompt } from './buildPricePrompt';

// In the system prompt construction:
const priceData = buildPricePrompt();

const systemPrompt = `You are a professional nutritionist and budget meal planner.

${priceData}

When creating recipes, use the prices above to calculate ingredient costs. Prefer LOCAL prices when available for more accurate budget estimates. If an ingredient is not listed in either price source, estimate conservatively based on similar items.

[... rest of the JSON schema instructions ...]`;
```

### 4. Update the weekly summary UI

In the WeeklySummary component (or wherever the budget bar is rendered), add a small line showing the price data source:

```tsx
<span className="text-xs text-gray-500 font-mono">
  Prices: Walmart Worcester, MA (Mar 2026) + USDA/BLS national avg
</span>
```

### 5. Do NOT build a scraper

Do not attempt to scrape the USA Today page, Walmart, or any other retailer. The local_prices.json file is manually maintained. This is intentional: it keeps the project simple, avoids legal issues with web scraping, and is honest about the data pipeline for the class presentation. The story is: "we could automate this with the Bright Data API or Kroger API in production, but for the demo we manually sourced current local prices from a public tracker."

### Verification

After implementing, generate a meal plan and check:
- Ingredients that match local items (chicken, eggs, rice, potatoes) should use the Walmart Worcester prices
- Ingredients not in the local set (salmon, avocados, quinoa) should use USDA/BLS national prices
- The weekly cost total should be lower than before (Walmart prices tend to be below national averages)
