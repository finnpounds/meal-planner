/**
 * priceLookup.js — Grocery ingredient price estimation from federal data
 *
 * Sources: USDA ERS Fruit & Vegetable Prices (2023), BLS CPI Average Price (Feb 2026),
 *          USDA Meat Price Spreads (Jan 2026)
 *
 * Total: 275 items from federal datasets + 60 static fallbacks = ~335 ingredients
 *
 * Usage:
 *   import { estimateIngredientCost, lookupPrice, loadPricesSync } from './priceLookup';
 *   import priceData from './grocery_price_lookup.json';
 *   loadPricesSync(priceData);
 *
 *   estimateIngredientCost("2 lbs chicken breast")  // → 8.28
 *   estimateIngredientCost("1 dozen eggs")           // → 2.50
 *   lookupPrice("bananas")                           // → { price: 0.65, unit: "per pound", ... }
 */

let priceIndex = null;
const aliasMap = new Map();

export function loadPricesSync(data) {
  priceIndex = data.prices;
  buildAliasIndex();
}

export async function loadPrices(jsonPath = './grocery_price_lookup.json') {
  if (priceIndex) return;
  const resp = await fetch(jsonPath);
  const data = await resp.json();
  loadPricesSync(data);
}

// --- Alias mapping for common ingredient names ---
const MANUAL_ALIASES = {
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

const STATIC_FALLBACKS = {
  'salmon': { price: 10.50, unit: 'per pound' }, 'shrimp': { price: 8.95, unit: 'per pound' },
  'tilapia': { price: 4.85, unit: 'per pound' }, 'cod': { price: 9.25, unit: 'per pound' },
  'tofu': { price: 2.50, unit: 'per pound' }, 'tempeh': { price: 5.30, unit: 'per pound' },
  'edamame': { price: 3.25, unit: 'per pound' }, 'ground turkey': { price: 4.95, unit: 'per pound' },
  'turkey breast': { price: 5.50, unit: 'per pound' }, 'turkey': { price: 1.89, unit: 'per pound' },
  'lamb': { price: 7.80, unit: 'per pound' },
  'sausage': { price: 4.65, unit: 'per pound' }, 'italian sausage': { price: 4.65, unit: 'per pound' },
  'tuna': { price: 1.30, unit: 'per 5oz can' }, 'canned tuna': { price: 1.30, unit: 'per 5oz can' },
  'yogurt': { price: 1.25, unit: 'per 5.3oz cup' }, 'greek yogurt': { price: 1.50, unit: 'per 5.3oz cup' },
  'peanut butter': { price: 4.25, unit: 'per 16oz jar' },
  'olive oil': { price: 8.50, unit: 'per 17oz bottle' }, 'vegetable oil': { price: 4.95, unit: 'per 48oz bottle' },
  'canola oil': { price: 4.95, unit: 'per 48oz bottle' }, 'coconut oil': { price: 6.75, unit: 'per 14oz jar' },
  'sesame oil': { price: 4.25, unit: 'per 8oz bottle' }, 'soy sauce': { price: 3.15, unit: 'per 15oz bottle' },
  'fish sauce': { price: 3.50, unit: 'per 12oz bottle' }, 'vinegar': { price: 2.85, unit: 'per 32oz' },
  'rice vinegar': { price: 3.25, unit: 'per 12oz' }, 'honey': { price: 5.60, unit: 'per 12oz' },
  'maple syrup': { price: 9.50, unit: 'per 12oz' }, 'coconut milk': { price: 2.35, unit: 'per 13.5oz can' },
  'tahini': { price: 5.50, unit: 'per 16oz jar' }, 'tortillas': { price: 3.25, unit: 'per package' },
  'flour tortillas': { price: 3.25, unit: 'per package' }, 'corn tortillas': { price: 2.45, unit: 'per package' },
  'quinoa': { price: 4.20, unit: 'per pound' }, 'oats': { price: 1.95, unit: 'per pound' },
  'rolled oats': { price: 1.95, unit: 'per pound' }, 'couscous': { price: 2.80, unit: 'per pound' },
  'garlic': { price: 5.80, unit: 'per pound' }, 'ginger': { price: 5.50, unit: 'per pound' },
  'cilantro': { price: 0.85, unit: 'per bunch' }, 'parsley': { price: 1.10, unit: 'per bunch' },
  'basil': { price: 2.50, unit: 'per package' }, 'green onions': { price: 1.10, unit: 'per bunch' },
  'scallions': { price: 1.10, unit: 'per bunch' }, 'lime': { price: 0.35, unit: 'each' },
  'limes': { price: 1.70, unit: 'per pound' }, 'mozzarella': { price: 5.40, unit: 'per pound' },
  'parmesan': { price: 10.50, unit: 'per pound' }, 'feta': { price: 7.50, unit: 'per pound' },
  'cream cheese': { price: 4.20, unit: 'per pound' }, 'sour cream': { price: 2.85, unit: 'per 16oz' },
  'heavy cream': { price: 4.50, unit: 'per pint' }, 'cottage cheese': { price: 3.40, unit: 'per pound' },
  'chicken broth': { price: 2.45, unit: 'per 32oz carton' }, 'beef broth': { price: 2.65, unit: 'per 32oz carton' },
  'vegetable broth': { price: 2.45, unit: 'per 32oz carton' }, 'tomato paste': { price: 1.10, unit: 'per 6oz can' },
  'salsa': { price: 3.50, unit: 'per 16oz jar' }, 'hot sauce': { price: 3.75, unit: 'per bottle' },
  'sriracha': { price: 3.75, unit: 'per 17oz bottle' }, 'mustard': { price: 1.85, unit: 'per 14oz' },
  'mayonnaise': { price: 5.25, unit: 'per 30oz jar' }, 'ketchup': { price: 3.65, unit: 'per 32oz' },
  'almonds': { price: 7.80, unit: 'per pound' }, 'walnuts': { price: 6.50, unit: 'per pound' },
  'cashews': { price: 8.50, unit: 'per pound' }, 'pecans': { price: 9.25, unit: 'per pound' },
  'peanuts': { price: 3.75, unit: 'per pound' }, 'chia seeds': { price: 6.80, unit: 'per pound' },
  'flax seeds': { price: 3.50, unit: 'per pound' },
};

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

// --- Core lookup ---
export function lookupPrice(ingredientName) {
  if (!priceIndex) throw new Error('Call loadPrices() or loadPricesSync() first');
  const q = ingredientName.toLowerCase().trim().replace(/[,.]$/, '');

  // Direct match
  if (priceIndex[q]) return { key: q, ...priceIndex[q] };
  // Alias
  const ak = aliasMap.get(q);
  if (ak && priceIndex[ak]) return { key: ak, ...priceIndex[ak] };
  // Static fallback
  if (STATIC_FALLBACKS[q]) return { key: q, ...STATIC_FALLBACKS[q], source: 'static estimate' };

  // Strip form modifiers and retry
  const stripped = q.replace(/^(fresh|frozen|canned|dried|raw|organic|large|small|medium)\s+/, '')
                     .replace(/\s+(fresh|frozen|canned|dried)$/, '');
  if (stripped !== q) {
    if (priceIndex[stripped]) return { key: stripped, ...priceIndex[stripped] };
    const ak2 = aliasMap.get(stripped);
    if (ak2 && priceIndex[ak2]) return { key: ak2, ...priceIndex[ak2] };
    if (STATIC_FALLBACKS[stripped]) return { key: stripped, ...STATIC_FALLBACKS[stripped], source: 'static estimate' };
  }

  // Fuzzy word overlap
  const words = q.split(/[\s,]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const key of [...Object.keys(priceIndex), ...Object.keys(STATIC_FALLBACKS)]) {
    const kw = key.split(/[\s,]+/).filter(w => w.length > 2);
    const overlap = words.filter(w => kw.some(k => k.includes(w) || w.includes(k))).length;
    const score = overlap / Math.max(words.length, 1);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      const d = priceIndex[key] || STATIC_FALLBACKS[key];
      best = { key, ...d, source: d.source || 'static estimate' };
    }
  }
  return best;
}

// --- Cost estimation ---
const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };
const QTY_RE = /^([\d./½¼¾⅓⅔]+)\s*(lbs?|pounds?|oz|ounces?|cups?|g|grams?|kg|gallons?|gal|pints?|dozen|doz|bunch|cans?|packages?|pkg|bottles?|heads?|each|tbsp|tsp|cloves?|stalks?|slices?|medium|large|small)?(\s+|$)/;
const LB = { lb:1,lbs:1,pound:1,pounds:1,oz:1/16,ounce:1/16,ounces:1/16,g:1/453.6,gram:1/453.6,grams:1/453.6,kg:2.205,cup:0.5,cups:0.5,gallon:8.6,gallons:8.6,gal:8.6,pint:1.04,pints:1.04 };
const FIXED = { dozen:4.95,doz:4.95,bunch:1.10,can:1.50,cans:1.50,head:2.00,heads:2.00,package:3.50,packages:3.50,pkg:3.50,bottle:3.50,bottles:3.50,clove:0.25,cloves:0.25,stalk:0.40,stalks:0.40,tbsp:0.15,tsp:0.05,slice:0.30,slices:0.30 };
const ITEM_WT = { egg:0.125,banana:0.25,apple:0.44,orange:0.44,lemon:0.25,lime:0.15,avocado:0.44,potato:0.5,onion:0.5,tomato:0.44,carrot:0.17,cucumber:0.5,zucchini:0.5,'bell pepper':0.5,'sweet potato':0.5 };

function parseAmt(s) { for (const [f,v] of Object.entries(FRAC)) s=s.replace(f,String(v)); return s.includes('/')?parseFloat(s.split('/')[0])/parseFloat(s.split('/')[1]):parseFloat(s); }

export function estimateIngredientCost(ingredientStr) {
  const c = ingredientStr.toLowerCase().trim();
  const m = c.match(QTY_RE);
  let amt = 1, unit = 'each', ing = c;
  if (m && m[1]) { amt = parseAmt(m[1]); unit = (m[2]||'each'); ing = c.slice(m[0].length).replace(/^of\s+/,'').trim(); if(!ing){ing=unit;unit='each';} }
  if(isNaN(amt)) amt=1;

  const info = lookupPrice(ing);
  if (!info) return Math.round(amt * 1.50 * 100) / 100;

  const u = unit.replace(/s$/, '');

  // Dozen / gallon — use price directly if unit matches
  if ((u==='dozen'||u==='doz') && info.unit?.includes('dozen')) return Math.round(amt*info.price*100)/100;
  if ((u==='gallon'||u==='gal') && info.unit?.includes('gallon')) return Math.round(amt*info.price*100)/100;
  if ((u==='pint'||u==='pt') && info.unit?.includes('pint')) return Math.round(amt*info.price*100)/100;

  // Fixed-unit items
  if (FIXED[u]) { const p = (info.unit?.includes(u)||info.unit?.includes('bunch')||info.unit?.includes('can')||info.unit?.includes('package')||info.unit?.includes('bottle'))?info.price:FIXED[u]; return Math.round(amt*p*100)/100; }

  // "each" — estimate weight
  if (['each','medium','large','small'].includes(u)) {
    const w = ITEM_WT[ing] || ITEM_WT[ing.replace(/s$/,'')] || 0.5;
    return Math.round(amt*w*(info.price||2)*100)/100;
  }

  // Weight conversion
  if (LB[u]) return Math.round(amt*LB[u]*(info.price||2)*100)/100;

  return Math.round(amt*(info.price||2)*100)/100;
}

export function estimateRecipeCost(ingredients) {
  return Math.round(ingredients.reduce((s, i) => s + estimateIngredientCost(i), 0) * 100) / 100;
}

export default { loadPrices, loadPricesSync, lookupPrice, estimateIngredientCost, estimateRecipeCost };
