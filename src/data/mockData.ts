// Seeded mock data for the whole dashboard.
//
// One demand model drives everything, so panels agree with each other:
//   expected units = item base × store scale × affinity × weekday × trend × weather × event × promo
//   forecast       = expected ± model error          (blind to anomalies)
//   actual demand  = expected × anomaly ± noise
//   baked          = forecast × (1 + safety buffer) × store habit bias
//   sold           = min(demand, baked);  wasted = baked − sold
//   revenue        = sold × price × promo price
//
// Today (d = 0) holds full-day projected values; aggregation scales sales to "as of now"
// with the hourly curves below.

import type {
  Anomaly, Category, DayContext, Item, Sale, Store, WasteReason, Weather,
} from '../types';
import { CLOSE_HOUR, OPEN_HOUR, SAFETY_BUFFER } from '../config';
import { noise, rand } from './rng';

export const HISTORY_DAYS = 182; // d = -181 … 0 (a quarter plus the quarter before it)
export const FUTURE_DAYS = 14;

export const STORES: Store[] = [
  { id: 's1', name: 'Midtown', short: 'Store 1', avgTicket: 12.4, scale: 1.25 },
  { id: 's2', name: 'Riverside', short: 'Store 2', avgTicket: 11.6, scale: 1.0 },
  { id: 's3', name: 'Old Mill', short: 'Store 3', avgTicket: 13.1, scale: 0.9 },
  { id: 's4', name: 'Harbor Point', short: 'Store 4', avgTicket: 14.2, scale: 1.1 },
  { id: 's5', name: 'Eastgate', short: 'Store 5', avgTicket: 10.8, scale: 0.8 },
  { id: 's6', name: 'Sunset Ave', short: 'Store 6', avgTicket: 12.0, scale: 0.95 },
];

export const ITEMS: Item[] = [
  { id: 'sourdough', name: 'Country Sourdough', category: 'breads', price: 7.5, unitCost: 2.2, baseUnits: 45, shelfLifeHrs: 10 },
  { id: 'baguette', name: 'Baguette', category: 'breads', price: 4.0, unitCost: 1.1, baseUnits: 60, shelfLifeHrs: 8 },
  { id: 'milkbread', name: 'Milk Bread Loaf', category: 'breads', price: 6.5, unitCost: 1.9, baseUnits: 40, shelfLifeHrs: 12 },
  { id: 'multigrain', name: 'Multigrain Loaf', category: 'breads', price: 7.0, unitCost: 2.1, baseUnits: 25, shelfLifeHrs: 12 },
  { id: 'croissant', name: 'Butter Croissant', category: 'pastries', price: 4.25, unitCost: 1.3, baseUnits: 110, shelfLifeHrs: 6 },
  { id: 'almond', name: 'Almond Croissant', category: 'pastries', price: 5.25, unitCost: 1.7, baseUnits: 60, shelfLifeHrs: 7 },
  { id: 'painchoc', name: 'Pain au Chocolat', category: 'pastries', price: 4.75, unitCost: 1.5, baseUnits: 70, shelfLifeHrs: 6 },
  { id: 'cinnamon', name: 'Cinnamon Roll', category: 'pastries', price: 4.5, unitCost: 1.2, baseUnits: 55, shelfLifeHrs: 8 },
  { id: 'eggtart', name: 'Egg Tart', category: 'pastries', price: 3.5, unitCost: 0.95, baseUnits: 80, shelfLifeHrs: 6 },
  { id: 'shortcake', name: 'Strawberry Shortcake', category: 'cakes', price: 6.5, unitCost: 2.3, baseUnits: 35, shelfLifeHrs: 14 },
  { id: 'matcha', name: 'Matcha Roll', category: 'cakes', price: 5.75, unitCost: 1.9, baseUnits: 30, shelfLifeHrs: 14 },
  { id: 'cheesecake', name: 'Cheesecake Slice', category: 'cakes', price: 6.0, unitCost: 2.0, baseUnits: 28, shelfLifeHrs: 16 },
  { id: 'latte', name: 'Latte', category: 'drinks', price: 5.25, unitCost: 1.1, baseUnits: 120, shelfLifeHrs: 0, madeToOrder: true },
  { id: 'milktea', name: 'Milk Tea', category: 'drinks', price: 5.5, unitCost: 1.0, baseUnits: 90, shelfLifeHrs: 0, madeToOrder: true },
  { id: 'coldbrew', name: 'Cold Brew', category: 'drinks', price: 4.75, unitCost: 0.8, baseUnits: 60, shelfLifeHrs: 0, madeToOrder: true },
  { id: 'porkfloss', name: 'Pork Floss Bun', category: 'savory', price: 3.75, unitCost: 1.1, baseUnits: 55, shelfLifeHrs: 5 },
  { id: 'hamcheese', name: 'Ham & Cheese Danish', category: 'savory', price: 5.0, unitCost: 1.6, baseUnits: 50, shelfLifeHrs: 5 },
  { id: 'curry', name: 'Curry Bun', category: 'savory', price: 4.25, unitCost: 1.2, baseUnits: 45, shelfLifeHrs: 5 },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, Item>;
export const STORE_BY_ID = Object.fromEntries(STORES.map((s) => [s.id, s])) as Record<string, Store>;
export const BAKED_ITEMS = ITEMS.filter((i) => !i.madeToOrder);

// ---------------------------------------------------------------------------
// Hourly demand curves (share of a category's daily sales in each hour, 6 AM–8 PM)
// ---------------------------------------------------------------------------
export const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const RAW_CURVES: Record<Category, number[]> = {
  //          6  7   8   9   10 11  12  13  14 15 16 17 18 19
  pastries: [6, 14, 16, 13, 9, 7, 6, 5, 6, 5, 4, 4, 3, 2],
  drinks: [6, 13, 14, 11, 8, 7, 7, 6, 7, 6, 5, 4, 4, 2],
  breads: [3, 6, 8, 7, 6, 7, 7, 6, 6, 7, 9, 11, 10, 7],
  savory: [2, 4, 5, 6, 8, 14, 17, 12, 8, 6, 6, 6, 4, 2],
  cakes: [1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 12, 10, 9, 7],
};
export const CURVES = Object.fromEntries(
  Object.entries(RAW_CURVES).map(([k, arr]) => {
    const total = arr.reduce((a, b) => a + b, 0);
    return [k, arr.map((v) => v / total)];
  }),
) as Record<Category, number[]>;

/** Share of a category's daily sales that has happened by `hour` (fractional hour, e.g. 11.5). */
export function cumFraction(cat: Category, hour: number): number {
  if (hour <= OPEN_HOUR) return 0;
  if (hour >= CLOSE_HOUR) return 1;
  const curve = CURVES[cat];
  let acc = 0;
  for (let i = 0; i < curve.length; i++) {
    const h = OPEN_HOUR + i;
    if (hour >= h + 1) acc += curve[i];
    else if (hour > h) acc += curve[i] * (hour - h);
  }
  return acc;
}

/** Inverse of cumFraction: the hour by which `frac` of the day's demand has arrived. */
function hourAtFraction(cat: Category, frac: number): number {
  const curve = CURVES[cat];
  let acc = 0;
  for (let i = 0; i < curve.length; i++) {
    if (acc + curve[i] >= frac) return OPEN_HOUR + i + (frac - acc) / curve[i];
    acc += curve[i];
  }
  return CLOSE_HOUR;
}

// ---------------------------------------------------------------------------
// Calendar: dates, weather, holidays, local events, promos
// ---------------------------------------------------------------------------
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
export const TODAY_DATE = TODAY;

export function dateFor(d: number): Date {
  const dt = new Date(TODAY);
  dt.setDate(dt.getDate() + d);
  return dt;
}
const ymd = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
export const TOMORROW_DOW = dateFor(1).getDay();

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const dt = new Date(year, month, 1);
  const shift = (weekday - dt.getDay() + 7) % 7;
  dt.setDate(1 + shift + (n - 1) * 7);
  return dt;
}

type CatMult = Partial<Record<Category | 'all', number>>;
interface EventDef { name: string; mult: CatMult }

function eventFor(dt: Date): EventDef | null {
  const y = dt.getFullYear();
  const key = ymd(dt);
  const tg = nthWeekday(y, 10, 4, 4);
  const tgEve = new Date(tg); tgEve.setDate(tg.getDate() - 1);
  const blackFri = new Date(tg); blackFri.setDate(tg.getDate() + 1);
  const holidays: [Date, EventDef][] = [
    [tgEve, { name: 'Thanksgiving Eve', mult: { breads: 1.55, cakes: 1.85, pastries: 1.15 } }],
    [tg, { name: 'Thanksgiving (close 1 PM)', mult: { all: 0.4 } }],
    [blackFri, { name: 'Black Friday', mult: { all: 1.1, pastries: 1.22, drinks: 1.18 } }],
    [new Date(y, 11, 24), { name: 'Christmas Eve', mult: { breads: 1.4, cakes: 1.9, pastries: 1.1 } }],
    [new Date(y, 11, 25), { name: 'Christmas Day (closed PM)', mult: { all: 0.3 } }],
    [new Date(y, 11, 31), { name: "New Year's Eve", mult: { cakes: 1.35, breads: 1.1 } }],
    [new Date(y, 6, 4), { name: 'Independence Day', mult: { all: 0.75 } }],
    [nthWeekday(y, 8, 1, 1), { name: 'Labor Day', mult: { all: 0.85 } }],
    [new Date(y, 9, 31), { name: 'Halloween', mult: { pastries: 1.15, cakes: 1.12 } }],
  ];
  for (const [hd, ev] of holidays) if (ymd(hd) === key) return ev;

  if (dt.getDay() === 6) {
    const month = dt.getMonth();
    const week = Math.floor(dt.getDate() / 7);
    if (month >= 8 && month <= 10 && week % 2 === 0) {
      return { name: 'University home game', mult: { drinks: 1.18, savory: 1.22, pastries: 1.05 } };
    }
    return { name: 'Farmers market', mult: { pastries: 1.08, drinks: 1.1, breads: 1.06 } };
  }
  return null;
}

function promoFor(dt: Date): { name: string; items: string[]; lift: number; price: number } | null {
  if (dt.getDay() === 2) {
    return { name: 'Croissant Tuesday · 20% off', items: ['croissant', 'almond', 'painchoc'], lift: 1.32, price: 0.8 };
  }
  return null;
}

function weatherFor(dt: Date): { tempF: number; weather: Weather; rainChance: number } {
  const start = new Date(dt.getFullYear(), 0, 0);
  const doy = Math.floor((dt.getTime() - start.getTime()) / 86400000);
  const seasonal = Math.sin((2 * Math.PI * (doy - 110)) / 365); // +1 in July, −1 in January
  const k = ymd(dt);
  const tempF = Math.round(66 + 18 * seasonal + noise(9, 'temp', k));
  const rainChance = Math.min(0.85, Math.max(0.02, 0.06 + 0.32 * Math.max(0, -seasonal) + noise(0.25, 'rainp', k)));
  const r = rand('wx', k);
  const weather: Weather = r < rainChance ? 'rain' : r < rainChance + 0.18 ? 'cloudy' : r < rainChance + 0.42 ? 'partly' : 'sunny';
  // Displayed precipitation chance: high on days modelled as rainy, low otherwise.
  const shown = weather === 'rain' ? 0.55 + 0.4 * rand('pop', k) : Math.min(0.3, rainChance * 0.6);
  return { tempF, weather, rainChance: Math.round(shown * 100) / 100 };
}

export function weatherMult(cat: Category, tempF: number, weather: Weather): number {
  let m = 1;
  if (weather === 'rain') m *= cat === 'drinks' ? 0.95 : 0.9;
  if (tempF > 82) m *= cat === 'drinks' ? 1.16 : cat === 'breads' ? 0.92 : cat === 'pastries' ? 0.95 : 1;
  if (tempF < 50) m *= cat === 'drinks' ? 1.08 : cat === 'savory' ? 1.06 : 1;
  return m;
}

const DOW_MULT = [1.12, 0.86, 0.9, 0.95, 0.98, 1.08, 1.22]; // Sun … Sat

// Typical revenue mix, used to turn per-category multipliers into a single headline %.
const MIX: Record<Category, number> = { breads: 0.19, pastries: 0.31, cakes: 0.11, drinks: 0.27, savory: 0.12 };
const catMult = (m: CatMult, cat: Category) => (m[cat] ?? 1) * (m.all ?? 1);
function headlineImpact(m: CatMult): number {
  return (Object.keys(MIX) as Category[]).reduce((acc, c) => acc + MIX[c] * catMult(m, c), 0) - 1;
}

export function buildDayContext(d: number): DayContext {
  const date = dateFor(d);
  const wx = weatherFor(date);
  const ev = eventFor(date);
  const promo = promoFor(date);
  return {
    d, date, ...wx,
    event: ev?.name ?? null,
    eventImpact: ev ? headlineImpact(ev.mult) : 0,
    promo: promo?.name ?? null,
    promoImpact: promo ? 0.07 : 0, // ~7% lift in chain revenue on promo days
  };
}

// Anomalies the forecast could not have known about. Shown as pulsing markers.
export const ANOMALIES: Anomaly[] = [
  { d: -9, storeId: 's2', mult: 0.7, label: 'Street closure', detail: 'Main St water-main repair blocked parking 7 AM–2 PM. Riverside ran ~30% under forecast.' },
  { d: -4, storeId: null, mult: 1.17, label: 'Viral egg-tart post', detail: 'A local food creator featured the egg tart. Chain traffic +17% vs forecast; egg tarts sold out at 4 stores.' },
  { d: -12, storeId: 's4', mult: 0.78, label: 'POS outage', detail: 'Card reader outage 11:10–11:55 AM at Harbor Point; cash-only service, walkouts logged.' },
];
const anomalyMult = (d: number, storeId: string) =>
  ANOMALIES.filter((a) => a.d === d && (a.storeId === null || a.storeId === storeId)).reduce((m, a) => m * a.mult, 1);

/** Intraday anomaly for the hourly chart: a pre-ordered pickup at Harbor Point today. */
export function intradayAnomaly(nowHour: number) {
  const hour = Math.min(18, Math.max(7, Math.floor(nowHour) - 2));
  return {
    storeId: 's4',
    hour,
    share: 0.09, // share of Harbor Point's pastry day pulled into this hour
    label: 'Field-trip pickup',
    detail: `Pre-ordered pickup of 96 pastries for a school field trip at Harbor Point, ${fmtHour(hour)}.`,
  };
}

export function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

// ---------------------------------------------------------------------------
// The demand model
// ---------------------------------------------------------------------------
const affinity = (s: Store, it: Item) => 0.8 + 0.4 * rand('aff', s.id, it.id);

export interface WhatIf { discount: number; tempOffset: number }

export function expectedUnits(s: Store, it: Item, ctx: DayContext, whatIf?: WhatIf): { units: number; priceFactor: number } {
  const ev = eventFor(ctx.date);
  const promo = promoFor(ctx.date);
  const trend = 1 + 0.0004 * ctx.d;
  let units =
    it.baseUnits * s.scale * affinity(s, it) * DOW_MULT[ctx.date.getDay()] * trend *
    weatherMult(it.category, ctx.tempF + (whatIf?.tempOffset ?? 0), ctx.weather) *
    (ev ? catMult(ev.mult, it.category) : 1);
  let priceFactor = 1;
  if (promo && promo.items.includes(it.id)) {
    units *= promo.lift;
    priceFactor = promo.price;
  }
  if (whatIf && whatIf.discount > 0 && !it.madeToOrder) {
    units *= 1 + 1.9 * whatIf.discount; // price elasticity ≈ −1.9 for baked goods
    priceFactor *= 1 - whatIf.discount;
  }
  return { units, priceFactor };
}

/** Habitual over/under-baking per store. A few patterns are planted for the assistant to find. */
function bakeBias(s: Store, it: Item, d: number, dow: number): number {
  if (s.id === 's1' && it.id === 'almond') return 0.8;
  if (s.id === 's5' && it.id === 'eggtart' && d >= -13) return 1.1;
  return 0.97 + 0.09 * rand('bias', s.id, it.category);
}

const BASE_SHARES: Record<WasteReason, number> = { overproduction: 0.56, expired: 0.24, damaged: 0.08, quality: 0.12 };
const S5_RECENT: Record<WasteReason, number> = { overproduction: 0.4, expired: 0.42, damaged: 0.06, quality: 0.12 };

function splitWaste(total: number, s: Store, itemId: string, d: number): Record<WasteReason, number> {
  const shares = s.id === 's5' && d >= -13 ? S5_RECENT : BASE_SHARES;
  // Seeded stochastic rounding keeps small counts honest (no systematic flooring into one bucket).
  let left = total;
  const take = (k: WasteReason) => {
    const n = Math.min(left, Math.floor(total * shares[k] + rand('ws', k, s.id, itemId, d)));
    left -= n;
    return n;
  };
  const expired = take('expired');
  const quality = take('quality');
  const damaged = take('damaged');
  return { overproduction: left, expired, damaged, quality };
}

// ---------------------------------------------------------------------------
// Generate history
// ---------------------------------------------------------------------------
export const DAY_CONTEXT: Record<number, DayContext> = {};
for (let d = -(HISTORY_DAYS - 1); d <= FUTURE_DAYS; d++) DAY_CONTEXT[d] = buildDayContext(d);

/** SALES_BY_DAY[d + HISTORY_DAYS - 1] → every Sale for that day. */
export const SALES_BY_DAY: Sale[][] = [];
/** Store-day ticket size wobble so transactions aren't a constant ratio of revenue. */
export const TICKET: Record<string, number> = {};

for (let d = -(HISTORY_DAYS - 1); d <= 0; d++) {
  const ctx = DAY_CONTEXT[d];
  const dow = ctx.date.getDay();
  const day: Sale[] = [];
  for (const s of STORES) {
    TICKET[`${s.id}:${d}`] = s.avgTicket * (1 + noise(0.05, 'ticket', s.id, d));
    const anom = anomalyMult(d, s.id);
    for (const it of ITEMS) {
      const { units: E, priceFactor } = expectedUnits(s, it, ctx);
      // Forecast error has chain-, store- and item-level parts so it doesn't average away.
      const forecastUnits = E * (1 + noise(0.07, 'fcchain', d) + noise(0.12, 'fcstore', s.id, d) + noise(0.05, 'fc', s.id, it.id, d));
      let demand = E * anom * (1 + noise(0.1, 'dm', s.id, it.id, d));
      if (d === -4 && it.id === 'eggtart') demand *= 1.6; // the viral post
      demand = Math.max(0, Math.round(demand));

      let baked: number, sold: number;
      if (it.madeToOrder) {
        baked = sold = demand;
      } else {
        baked = Math.round(forecastUnits * (1 + SAFETY_BUFFER) * bakeBias(s, it, d, dow));
        // Planted habit: Old Mill bakes a fixed sourdough par on tomorrow's weekday, ignoring the forecast.
        if (s.id === 's3' && it.id === 'sourdough' && dow === TOMORROW_DOW) {
          baked = Math.round(it.baseUnits * s.scale * affinity(s, it) * DOW_MULT[dow] * 1.5);
        }
        sold = Math.min(demand, baked);
      }
      const wasted = baked - sold;
      const soldOutHour = !it.madeToOrder && demand > baked && demand > 0 ? hourAtFraction(it.category, baked / demand) : null;
      day.push({
        d, storeId: s.id, itemId: it.id,
        demand, forecastUnits, baked, sold, wasted,
        waste: splitWaste(wasted, s, it.id, d),
        revenue: Math.round(sold * it.price * priceFactor * 100) / 100,
        soldOutHour,
      });
    }
  }
  SALES_BY_DAY.push(day);
}

export const salesOn = (d: number): Sale[] => SALES_BY_DAY[d + HISTORY_DAYS - 1] ?? [];

/** Forecast revenue for a store-day (past days), using the model's units at that day's prices. */
export function forecastRevenue(sales: Sale[]): number {
  let sum = 0;
  for (const r of sales) {
    const it = ITEM_BY_ID[r.itemId];
    const pf = promoFor(dateFor(r.d))?.items.includes(it.id) ? promoFor(dateFor(r.d))!.price : 1;
    sum += r.forecastUnits * it.price * pf;
  }
  return sum;
}

/** Chain-level revenue effect of a day's weather (for the drivers panel). */
export function weatherImpact(ctx: DayContext, tempOffset = 0): number {
  return (Object.keys(MIX) as Category[]).reduce((a, c) => a + MIX[c] * weatherMult(c, ctx.tempF + tempOffset, ctx.weather), 0) - 1;
}
