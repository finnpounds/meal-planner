/**
 * priceLookup.ts -- Grocery ingredient price estimation from federal data
 *
 * Sources: USDA ERS Fruit & Vegetable Prices (2023), BLS CPI Average Price (Feb 2026),
 *          USDA Meat Price Spreads (Jan 2026)
 *
 * Total: 215 items from federal datasets + 60 static fallbacks = ~275 ingredients
 *
 * APA: U.S. Department of Agriculture, Economic Research Service. (2023).
 *      Fruit and Vegetable Prices. https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices/
 *
 * APA: U.S. Bureau of Labor Statistics. (2026, February).
 *      Average retail food and energy prices, U.S. and Midwest region.
 *      https://www.bls.gov/regions/mid-atlantic/data/averageretailfoodandenergyprices_usandmidwest_table.htm
 */

import priceData from '@/data/grocery_price_lookup.json';

interface PriceEntry {
  price: number;
  unit: string;
  category?: string;
  source?: string;
  bls_series?: string;
}

interface PriceData {
  _meta?: unknown;
  prices: Record<string, PriceEntry>;
}

const STATIC_FALLBACKS: Record<string, PriceEntry> = {
  'salmon': { price: 10.50, unit: 'per pound', source: 'static estimate' },
  'shrimp': { price: 8.95, unit: 'per pound', source: 'static estimate' },
  'tilapia': { price: 4.85, unit: 'per pound', source: 'static estimate' },
  'cod': { price: 9.25, unit: 'per pound', source: 'static estimate' },
  'tofu': { price: 2.50, unit: 'per pound', source: 'static estimate' },
  'tempeh': { price: 5.30, unit: 'per pound', source: 'static estimate' },
  'edamame': { price: 3.25, unit: 'per pound', source: 'static estimate' },
  'ground turkey': { price: 4.95, unit: 'per pound', source: 'static estimate' },
  'turkey breast': { price: 5.50, unit: 'per pound', source: 'static estimate' },
  'turkey': { price: 1.89, unit: 'per pound', source: 'static estimate' },
  'lamb': { price: 7.80, unit: 'per pound', source: 'static estimate' },
  'sausage': { price: 4.65, unit: 'per pound', source: 'static estimate' },
  'italian sausage': { price: 4.65, unit: 'per pound', source: 'static estimate' },
  'tuna': { price: 1.30, unit: 'per 5oz can', source: 'static estimate' },
  'canned tuna': { price: 1.30, unit: 'per 5oz can', source: 'static estimate' },
  'yogurt': { price: 1.25, unit: 'per 5.3oz cup', source: 'static estimate' },
  'greek yogurt': { price: 1.50, unit: 'per 5.3oz cup', source: 'static estimate' },
  'peanut butter': { price: 4.25, unit: 'per 16oz jar', source: 'static estimate' },
  'olive oil': { price: 8.50, unit: 'per 17oz bottle', source: 'static estimate' },
  'vegetable oil': { price: 4.95, unit: 'per 48oz bottle', source: 'static estimate' },
  'canola oil': { price: 4.95, unit: 'per 48oz bottle', source: 'static estimate' },
  'coconut oil': { price: 6.75, unit: 'per 14oz jar', source: 'static estimate' },
  'sesame oil': { price: 4.25, unit: 'per 8oz bottle', source: 'static estimate' },
  'soy sauce': { price: 3.15, unit: 'per 15oz bottle', source: 'static estimate' },
  'fish sauce': { price: 3.50, unit: 'per 12oz bottle', source: 'static estimate' },
  'vinegar': { price: 2.85, unit: 'per 32oz', source: 'static estimate' },
  'rice vinegar': { price: 3.25, unit: 'per 12oz', source: 'static estimate' },
  'honey': { price: 5.60, unit: 'per 12oz', source: 'static estimate' },
  'maple syrup': { price: 9.50, unit: 'per 12oz', source: 'static estimate' },
  'coconut milk': { price: 2.35, unit: 'per 13.5oz can', source: 'static estimate' },
  'tahini': { price: 5.50, unit: 'per 16oz jar', source: 'static estimate' },
  'tortillas': { price: 3.25, unit: 'per package', source: 'static estimate' },
  'flour tortillas': { price: 3.25, unit: 'per package', source: 'static estimate' },
  'corn tortillas': { price: 2.45, unit: 'per package', source: 'static estimate' },
  'quinoa': { price: 4.20, unit: 'per pound', source: 'static estimate' },
  'oats': { price: 1.95, unit: 'per pound', source: 'static estimate' },
  'rolled oats': { price: 1.95, unit: 'per pound', source: 'static estimate' },
  'couscous': { price: 2.80, unit: 'per pound', source: 'static estimate' },
  'garlic': { price: 5.80, unit: 'per pound', source: 'static estimate' },
  'ginger': { price: 5.50, unit: 'per pound', source: 'static estimate' },
  'cilantro': { price: 0.85, unit: 'per bunch', source: 'static estimate' },
  'parsley': { price: 1.10, unit: 'per bunch', source: 'static estimate' },
  'basil': { price: 2.50, unit: 'per package', source: 'static estimate' },
  'green onions': { price: 1.10, unit: 'per bunch', source: 'static estimate' },
  'scallions': { price: 1.10, unit: 'per bunch', source: 'static estimate' },
  'lime': { price: 0.35, unit: 'each', source: 'static estimate' },
  'limes': { price: 1.70, unit: 'per pound', source: 'static estimate' },
  'mozzarella': { price: 5.40, unit: 'per pound', source: 'static estimate' },
  'parmesan': { price: 10.50, unit: 'per pound', source: 'static estimate' },
  'feta': { price: 7.50, unit: 'per pound', source: 'static estimate' },
  'cream cheese': { price: 4.20, unit: 'per pound', source: 'static estimate' },
  'sour cream': { price: 2.85, unit: 'per 16oz', source: 'static estimate' },
  'heavy cream': { price: 4.50, unit: 'per pint', source: 'static estimate' },
  'cottage cheese': { price: 3.40, unit: 'per pound', source: 'static estimate' },
  'chicken broth': { price: 2.45, unit: 'per 32oz carton', source: 'static estimate' },
  'beef broth': { price: 2.65, unit: 'per 32oz carton', source: 'static estimate' },
  'vegetable broth': { price: 2.45, unit: 'per 32oz carton', source: 'static estimate' },
  'tomato paste': { price: 1.10, unit: 'per 6oz can', source: 'static estimate' },
  'salsa': { price: 3.50, unit: 'per 16oz jar', source: 'static estimate' },
  'hot sauce': { price: 3.75, unit: 'per bottle', source: 'static estimate' },
  'sriracha': { price: 3.75, unit: 'per 17oz bottle', source: 'static estimate' },
  'mustard': { price: 1.85, unit: 'per 14oz', source: 'static estimate' },
  'mayonnaise': { price: 5.25, unit: 'per 30oz jar', source: 'static estimate' },
  'ketchup': { price: 3.65, unit: 'per 32oz', source: 'static estimate' },
  'almonds': { price: 7.80, unit: 'per pound', source: 'static estimate' },
  'walnuts': { price: 6.50, unit: 'per pound', source: 'static estimate' },
  'cashews': { price: 8.50, unit: 'per pound', source: 'static estimate' },
  'pecans': { price: 9.25, unit: 'per pound', source: 'static estimate' },
  'peanuts': { price: 3.75, unit: 'per pound', source: 'static estimate' },
  'chia seeds': { price: 6.80, unit: 'per pound', source: 'static estimate' },
  'flax seeds': { price: 3.50, unit: 'per pound', source: 'static estimate' },
};

const MANUAL_ALIASES: Record<string, string | null> = {
  'eggs': 'eggs, grade a large', 'egg': 'eggs, grade a large', 'large eggs': 'eggs, grade a large',
  'milk': 'milk, fresh, whole, fortified', 'whole milk': 'milk, fresh, whole, fortified',
  'butter': 'butter, stick',
  'pasta': 'spaghetti and macaroni', 'spaghetti': 'spaghetti and macaroni', 'noodles': 'spaghetti and macaroni',
  'rice': 'rice, white, long grain, uncooked', 'white rice': 'rice, white, long grain, uncooked',
  'flour': 'flour, white, all purpose', 'all-purpose flour': 'flour, white, all purpose',
  'bread': 'bread, white, pan', 'white bread': 'bread, white, pan', 'whole wheat bread': 'bread, whole wheat, pan',
  'chicken': 'chicken, fresh, whole', 'whole chicken': 'chicken, fresh, whole',
  'chicken breast': 'chicken breast, boneless', 'chicken thighs': 'chicken legs, bone-in', 'chicken legs': 'chicken legs, bone-in',
  'ground beef': 'ground beef, 100% beef', 'steak': 'all uncooked beef steaks',
  'sirloin steak': 'steak, sirloin, usda choice, boneless', 'ribeye': 'steak, rib eye, usda choice, boneless',
  'bacon': 'bacon, sliced', 'ham': 'all ham (not canned or sliced)',
  'pork chops': 'all pork chops', 'pork': 'all other pork excluding canned & sliced',
  'sausage': null, 'tuna': null,
  'cheddar': 'cheddar cheese, natural', 'cheese': 'cheddar cheese, natural', 'american cheese': 'american processed cheese',
  'yogurt': null, 'greek yogurt': null,
  'sugar': 'sugar, white', 'peanut butter': null,
  'coffee': 'coffee, 100%, ground roast',
  'potato': 'potatoes', 'potatoes': 'potatoes', 'sweet potato': 'sweet potatoes', 'sweet potatoes': 'sweet potatoes',
  'tomato': 'tomatoes, field grown', 'tomatoes': 'tomatoes, field grown',
  'canned tomatoes': 'tomatoes, canned, any type', 'diced tomatoes': 'tomatoes, canned, any type',
  'onion': 'onions', 'onions': 'onions', 'yellow onion': 'onions, dry yellow',
  'carrot': 'carrots, short trimmed and topped', 'carrots': 'carrots, short trimmed and topped',
  'lettuce': 'lettuce, iceberg', 'romaine': 'romaine lettuce',
  'corn': 'corn, canned', 'canned corn': 'corn, canned',
  'spinach': 'spinach, eaten raw', 'kale': 'kale',
  'bell pepper': 'peppers, sweet', 'bell peppers': 'peppers, sweet',
  'cucumber': 'cucumbers', 'mushrooms': 'mushrooms', 'mushroom': 'mushrooms',
  'avocado': 'avocados', 'broccoli': 'broccoli', 'cauliflower': 'cauliflower', 'cabbage': 'cabbage',
  'black beans': 'black beans', 'canned black beans': 'black beans, canned',
  'kidney beans': 'kidney beans', 'lentils': 'lentils', 'pinto beans': 'pinto beans',
};

// Build alias index at module load (server-side, runs once)
const priceIndex: Record<string, PriceEntry> = (priceData as PriceData).prices;
const aliasMap = new Map<string, string>();

function buildAliasIndex() {
  for (const key of Object.keys(priceIndex)) {
    aliasMap.set(key, key);
    const parts = key.split(',').map(s => s.trim());
    if (parts.length > 1) aliasMap.set(parts[0], key);
  }
  for (const [alias, canonical] of Object.entries(MANUAL_ALIASES)) {
    if (canonical) aliasMap.set(alias, canonical);
  }
}
buildAliasIndex();

export function lookupPrice(ingredientName: string): (PriceEntry & { key: string }) | null {
  const q = ingredientName.toLowerCase().trim().replace(/[,.]$/, '');

  if (priceIndex[q]) return { key: q, ...priceIndex[q] };
  const ak = aliasMap.get(q);
  if (ak && priceIndex[ak]) return { key: ak, ...priceIndex[ak] };
  if (STATIC_FALLBACKS[q]) return { key: q, ...STATIC_FALLBACKS[q] };

  const stripped = q
    .replace(/^(fresh|frozen|canned|dried|raw|organic|large|small|medium)\s+/, '')
    .replace(/\s+(fresh|frozen|canned|dried)$/, '');
  if (stripped !== q) {
    if (priceIndex[stripped]) return { key: stripped, ...priceIndex[stripped] };
    const ak2 = aliasMap.get(stripped);
    if (ak2 && priceIndex[ak2]) return { key: ak2, ...priceIndex[ak2] };
    if (STATIC_FALLBACKS[stripped]) return { key: stripped, ...STATIC_FALLBACKS[stripped] };
  }

  // Fuzzy word overlap
  const words = q.split(/[\s,]+/).filter(w => w.length > 2);
  let best: (PriceEntry & { key: string }) | null = null;
  let bestScore = 0;
  for (const key of [...Object.keys(priceIndex), ...Object.keys(STATIC_FALLBACKS)]) {
    const kw = key.split(/[\s,]+/).filter(w => w.length > 2);
    const overlap = words.filter(w => kw.some(k => k.includes(w) || w.includes(k))).length;
    const score = overlap / Math.max(words.length, 1);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      const d = priceIndex[key] ?? STATIC_FALLBACKS[key];
      best = { key, ...d };
    }
  }
  return best;
}

// --- Cost estimation ---
const FRAC: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };
const QTY_RE = /^([\d./½¼¾⅓⅔]+)\s*(lbs?|pounds?|oz|ounces?|cups?|g|grams?|kg|gallons?|gal|pints?|dozen|doz|bunch|cans?|packages?|pkg|bottles?|heads?|each|tbsp|tsp|cloves?|stalks?|slices?|medium|large|small)?(\s+|$)/;
const LB: Record<string, number> = { lb:1,lbs:1,pound:1,pounds:1,oz:1/16,ounce:1/16,ounces:1/16,g:1/453.6,gram:1/453.6,grams:1/453.6,kg:2.205,cup:0.5,cups:0.5,gallon:8.6,gallons:8.6,gal:8.6,pint:1.04,pints:1.04 };
const FIXED: Record<string, number> = { dozen:4.95,doz:4.95,bunch:1.10,can:1.50,cans:1.50,head:2.00,heads:2.00,package:3.50,packages:3.50,pkg:3.50,bottle:3.50,bottles:3.50,clove:0.10,cloves:0.10,stalk:0.40,stalks:0.40,tbsp:0.15,tsp:0.05,slice:0.30,slices:0.30 };
// Density (lb per cup) for ingredients where the generic 0.5 lb/cup is far off.
// Sources: USDA National Nutrient Database; recipe weight references.
const VOLUME_DENSITY: Record<string, number> = {
  'spinach': 0.062, 'baby spinach': 0.062,
  'kale': 0.067,
  'arugula': 0.062, 'mixed greens': 0.062, 'lettuce': 0.089, 'romaine': 0.089,
  'broccoli': 0.198, 'broccoli florets': 0.198,
  'cauliflower': 0.250, 'cauliflower florets': 0.250,
  'mushrooms': 0.156, 'sliced mushrooms': 0.156,
  'cabbage': 0.198, 'shredded cabbage': 0.198,
  'peas': 0.330, 'frozen peas': 0.330,
  'corn': 0.578, 'corn kernels': 0.578,
};
const ITEM_WT: Record<string, number> = { egg:0.125,banana:0.25,apple:0.44,orange:0.44,lemon:0.25,lime:0.15,avocado:0.44,potato:0.5,onion:0.5,tomato:0.44,carrot:0.17,cucumber:0.5,zucchini:0.5,'bell pepper':0.5,'sweet potato':0.5 };

function parseAmt(s: string): number {
  let str = s.trim();
  // Handle mixed whole+fraction ("1½" → "1.5") before standalone fractions ("½" → "0.5")
  // Without this, "1½".replace("½","0.5") → "10.5" instead of "1.5"
  for (const [f, v] of Object.entries(FRAC)) {
    str = str.replace(new RegExp(`(\\d+)${f}`), (_, d) => String(parseInt(d) + v));
    str = str.replace(f, String(v));
  }
  return str.includes('/') ? parseFloat(str.split('/')[0]) / parseFloat(str.split('/')[1]) : parseFloat(str);
}

export function estimateIngredientCost(ingredientStr: string): number {
  const c = ingredientStr.toLowerCase().trim();
  const m = c.match(QTY_RE);
  let amt = 1, unit = 'each', ing = c;
  if (m && m[1]) {
    amt = parseAmt(m[1]);
    unit = m[2] || 'each';
    ing = c.slice(m[0].length).replace(/^of\s+/, '').trim();
    if (!ing) { ing = unit; unit = 'each'; }
  }
  if (isNaN(amt)) amt = 1;

  const info = lookupPrice(ing);
  if (!info) {
    // Use per-use FIXED costs for small-quantity units (spices, condiments) instead of flat $1.50
    const u = unit.replace(/s$/, '');
    if (FIXED[u]) return Math.round(amt * FIXED[u] * 100) / 100;
    return Math.round(amt * 1.50 * 100) / 100;
  }

  const u = unit.replace(/s$/, '');

  if ((u === 'dozen' || u === 'doz') && info.unit?.includes('dozen')) return Math.round(amt * info.price * 100) / 100;
  if ((u === 'gallon' || u === 'gal') && info.unit?.includes('gallon')) return Math.round(amt * info.price * 100) / 100;
  if ((u === 'pint' || u === 'pt') && info.unit?.includes('pint')) return Math.round(amt * info.price * 100) / 100;

  if (FIXED[u]) {
    // Only inherit info.price when the lookup unit directly matches the query unit
    // (e.g., asking for "bunch" and entry is "per bunch", or "can" and "per can").
    // Bottle/jar-priced items (olive oil, soy sauce, sriracha) must use the FIXED
    // per-use cost when queried by tbsp or tsp — otherwise 1 tbsp olive oil = $8.50.
    const p = info.unit?.includes(u) ? info.price : FIXED[u];
    return Math.round(amt * p * 100) / 100;
  }

  if (['each', 'medium', 'large', 'small'].includes(u)) {
    // Eggs priced per dozen: use per-unit price rather than weight-based formula
    if (info.unit?.includes('dozen')) return Math.round(amt * (info.price / 12) * 100) / 100;
    const w = ITEM_WT[ing] ?? ITEM_WT[ing.replace(/s$/, '')] ?? 0.5;
    return Math.round(amt * w * (info.price || 2) * 100) / 100;
  }

  if (LB[u]) {
    // For cups, use ingredient-specific density when available (leafy greens, broccoli, etc.)
    if (u === 'cup' || u === 'cups') {
      const density = VOLUME_DENSITY[ing] ?? VOLUME_DENSITY[ing.replace(/s$/, '')] ?? LB['cup'];
      return Math.round(amt * density * (info.price || 2) * 100) / 100;
    }
    return Math.round(amt * LB[u] * (info.price || 2) * 100) / 100;
  }

  return Math.round(amt * (info.price || 2) * 100) / 100;
}

export function estimateRecipeCost(ingredients: string[]): number {
  return Math.round(ingredients.reduce((s, i) => s + estimateIngredientCost(i), 0) * 100) / 100;
}
