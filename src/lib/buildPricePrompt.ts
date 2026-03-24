// Builds the price section of the Groq system prompt by merging local and national data.
//
// APA: USA Today / Bright Data. (2026, March). Grocery Price Tracker (Walmart, Worcester, MA).
//      https://data.usatoday.com/projects/grocery-prices-tracker/
//
// APA: U.S. Department of Agriculture, Economic Research Service. (2023).
//      Fruit and Vegetable Prices. https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices/
//
// APA: U.S. Bureau of Labor Statistics. (2026, February).
//      Average retail food and energy prices, U.S. and Midwest region.
//      https://www.bls.gov/regions/mid-atlantic/data/averageretailfoodandenergyprices_usandmidwest_table.htm

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
let cachedMeta: { location: string; store: string; prices_as_of: string } | null = null;

export function buildPricePrompt(): string {
  if (cachedPrompt) return cachedPrompt;

  const nationalPath = path.join(process.cwd(), 'src/data/price_table_prompt.txt');
  const nationalPrices = fs.readFileSync(nationalPath, 'utf-8');

  const localPath = path.join(process.cwd(), 'src/data/local_prices.json');
  let localSection = '';

  try {
    const localRaw = fs.readFileSync(localPath, 'utf-8');
    const localData: LocalPriceData = JSON.parse(localRaw);
    const meta = localData._meta;
    cachedMeta = meta;

    const items = Object.entries(localData.prices).map(([name, info]) => {
      if (info.price_per_lb) return `${name} $${info.price_per_lb.toFixed(2)}/lb`;
      if (info.price_per_dozen) return `${name} $${info.price_per_dozen.toFixed(2)}/dozen`;
      if (info.price_per_gallon) return `${name} $${info.price_per_gallon.toFixed(2)}/gal`;
      if (info.price_per_head) return `${name} $${info.price_per_head.toFixed(2)}/head`;
      if (info.price_per_each) return `${name} $${info.price_per_each.toFixed(2)}/each`;
      return `${name} $${info.price.toFixed(2)}/${info.unit}`;
    });

    localSection = `LOCAL WALMART PRICES (${meta.location}, as of ${meta.prices_as_of}):\n${items.join(' | ')}\n\nPrefer local prices above when the ingredient matches. Fall back to national averages below for all other items.\n\n`;
  } catch {
    // No local prices file or invalid JSON -- use national only
  }

  cachedPrompt = localSection + nationalPrices;
  return cachedPrompt;
}

/** Returns local price metadata for display in the UI, or null if no local prices loaded. */
export function getLocalPriceMeta(): { location: string; store: string; prices_as_of: string } | null {
  if (!cachedPrompt) buildPricePrompt(); // ensure loaded
  return cachedMeta;
}
