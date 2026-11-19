// Every data shape the dashboard consumes. Swap src/data/mockData.ts for an API
// that returns these shapes and the UI keeps working.

export type Category = 'breads' | 'pastries' | 'cakes' | 'drinks' | 'savory';
export type WasteReason = 'overproduction' | 'expired' | 'damaged' | 'quality';
export type Disposition = 'donated' | 'bundled' | 'composted' | 'binned';
export type RangeKey = 'today' | '7d' | '30d' | 'quarter';
export type Weather = 'sunny' | 'partly' | 'cloudy' | 'rain';

export interface Store {
  id: string;
  name: string;
  short: string; // "Store 3" style label used in insights
  avgTicket: number;
  scale: number; // relative traffic
}

export interface Item {
  id: string;
  name: string;
  category: Category;
  price: number;
  unitCost: number;
  baseUnits: number; // typical daily units at a 1.0-scale store
  shelfLifeHrs: number; // hours from bake until markdown
  madeToOrder?: boolean; // drinks: no bake, no waste
}

/** One store × item × day. `d` is the day offset from today (0 = today, -1 = yesterday). */
export interface Sale {
  d: number;
  storeId: string;
  itemId: string;
  demand: number; // true customer demand (units)
  forecastUnits: number; // what the forecast model predicted
  baked: number;
  sold: number; // full-day units (projected to close for today)
  wasted: number;
  waste: Record<WasteReason, number>;
  revenue: number; // full-day revenue
  soldOutHour: number | null; // hour of day the item ran out, if it did
}

export interface DayContext {
  d: number;
  date: Date;
  tempF: number;
  weather: Weather;
  rainChance: number;
  event: string | null;
  eventImpact: number; // e.g. 0.6 = +60% (chain average, for display)
  promo: string | null;
  promoImpact: number;
}

export interface Anomaly {
  d: number;
  storeId: string | null; // null = chain-wide
  mult: number;
  label: string;
  detail: string;
}

export interface ForecastPoint {
  d: number;
  label: string;
  actual: number | null;
  forecast: number;
  band: [number, number];
  isToday: boolean;
  anomaly?: Anomaly;
}

export interface WasteEntry {
  d: number;
  label: string;
  units: number;
  value: number; // $ at cost
  rate: number;
}

export interface BakePlanItem {
  storeId: string;
  itemId: string;
  recommended: number;
  lastBaked: number;
  lastSold: number;
  planned: number;
  accepted: boolean;
  source: 'model' | 'manual' | 'assistant';
}

export interface Insight {
  id: string;
  tone: 'waste' | 'stockout' | 'ops' | 'opportunity';
  title: string;
  body: string;
  why: string[];
  storeId: string;
  /** Bake-plan edits applied when the user clicks "Apply to Bake Plan". */
  actions: { itemId: string; qty: number }[];
  actionLabel: string;
}
