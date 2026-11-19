// Pure aggregation over the mock data. Hooks in src/hooks wrap these with useMemo.

import type {
  BakePlanItem, Category, Disposition, ForecastPoint, Insight, RangeKey, Sale, WasteEntry, WasteReason,
} from '../types';
import {
  ANOMALIES, BAKED_ITEMS, CURVES, DAY_CONTEXT, FUTURE_DAYS, HOURS, ITEMS, ITEM_BY_ID, STORES, STORE_BY_ID,
  TICKET, TOMORROW_DOW, cumFraction, dateFor, expectedUnits, fmtHour, forecastRevenue, intradayAnomaly, salesOn,
  type WhatIf,
} from '../data/mockData';
import { SAFETY_BUFFER } from '../config';
import { rand } from '../data/rng';
import { WEEKDAYS_LONG, fmtDay, fmtDayShort } from './format';

export type StoreFilter = 'all' | string;
export const RANGE_DAYS: Record<RangeKey, number> = { today: 1, '7d': 7, '30d': 30, quarter: 90 };
export const RANGE_LABELS: Record<RangeKey, string> = { today: 'Today', '7d': '7 days', '30d': '30 days', quarter: 'Quarter' };

const pick = (sales: Sale[], store: StoreFilter) => (store === 'all' ? sales : sales.filter((s) => s.storeId === store));
const CATS: Category[] = ['breads', 'pastries', 'cakes', 'drinks', 'savory'];
const REASONS: WasteReason[] = ['overproduction', 'expired', 'damaged', 'quality'];

export interface Summary {
  revenue: number; // as of now for today, full day otherwise
  transactions: number;
  avgTicket: number;
  baked: number;
  sold: number;
  wasted: number;
  wasteValue: number;
  wasteRate: number;
  sellThrough: number;
  mape: number;
  reasons: Record<WasteReason, number>;
  byCategory: Record<Category, number>;
  byItem: Record<string, { revenue: number; units: number }>;
}

/**
 * Summarise a set of days. `partial` lists day offsets whose sales should be scaled to
 * "as of nowHour" (today, and the matching day in a comparison period).
 */
export function summarize(days: number[], store: StoreFilter, nowHour: number, partial: number[] = []): Summary {
  const out: Summary = {
    revenue: 0, transactions: 0, avgTicket: 0, baked: 0, sold: 0, wasted: 0, wasteValue: 0, wasteRate: 0, sellThrough: 0, mape: 0,
    reasons: { overproduction: 0, expired: 0, damaged: 0, quality: 0 },
    byCategory: { breads: 0, pastries: 0, cakes: 0, drinks: 0, savory: 0 },
    byItem: {},
  };
  let apeSum = 0;
  let apeN = 0;
  for (const d of days) {
    const rows = pick(salesOn(d), store);
    const isPartial = partial.includes(d);
    const storeRev: Record<string, number> = {};
    for (const r of rows) {
      const it = ITEM_BY_ID[r.itemId];
      const f = isPartial ? cumFraction(it.category, nowHour) : 1;
      const rev = r.revenue * f;
      out.revenue += rev;
      storeRev[r.storeId] = (storeRev[r.storeId] ?? 0) + rev;
      out.byCategory[it.category] += rev;
      const bi = (out.byItem[r.itemId] ??= { revenue: 0, units: 0 });
      bi.revenue += rev;
      bi.units += r.sold * f;
      if (!it.madeToOrder) {
        out.baked += r.baked;
        out.sold += r.sold;
        out.wasted += r.wasted;
        out.wasteValue += r.wasted * it.unitCost;
        for (const k of REASONS) out.reasons[k] += r.waste[k];
      }
    }
    for (const [sid, rev] of Object.entries(storeRev)) out.transactions += rev / TICKET[`${sid}:${d}`];
    // Accuracy is measured per store-day (full-day revenue vs forecast), even for "All stores".
    for (const sid of Object.keys(storeRev)) {
      const sr = rows.filter((r) => r.storeId === sid);
      const act = sr.reduce((a, r) => a + r.revenue, 0);
      if (act > 0) {
        apeSum += Math.abs(act - forecastRevenue(sr)) / act;
        apeN++;
      }
    }
  }
  out.transactions = Math.round(out.transactions);
  out.avgTicket = out.transactions ? out.revenue / out.transactions : 0;
  out.wasteRate = out.baked ? out.wasted / out.baked : 0;
  out.sellThrough = out.baked ? out.sold / out.baked : 0;
  out.mape = apeN ? apeSum / apeN : 0;
  return out;
}

export function periodDays(range: RangeKey): { current: number[]; previous: number[]; partial: number[] } {
  const n = RANGE_DAYS[range];
  const offset = n === 1 ? 7 : n; // "Today" compares with the same weekday last week
  const current = Array.from({ length: n }, (_, i) => -i);
  const previous = current.map((d) => d - offset);
  return { current, previous, partial: [0, -offset] };
}

/** Bake Score 0–100: forecast accuracy (40%), waste (35%), sell-through (25%). */
export function bakeScore(s: Summary) {
  const accuracy = Math.max(0, 1 - s.mape / 0.3);
  const waste = Math.max(0, 1 - s.wasteRate / 0.25);
  const sellThrough = Math.min(1, Math.max(0, (s.sellThrough - 0.7) / 0.3));
  return {
    score: Math.round(100 * (0.4 * accuracy + 0.35 * waste + 0.25 * sellThrough)),
    parts: { accuracy, waste, sellThrough },
  };
}

/** Closed-day series for KPI sparklines (oldest → newest). */
export function sparkSeries(store: StoreFilter, n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = -n + i;
    const s = summarize([d], store, 24);
    return { d, revenue: s.revenue, transactions: s.transactions, avgTicket: s.avgTicket, mape: s.mape, wasteRate: s.wasteRate, sellThrough: s.sellThrough };
  });
}

// --------------------------------------------------------------------------- Sales
export function leaderboard(range: RangeKey, nowHour: number) {
  const { current, previous, partial } = periodDays(range);
  return STORES.map((st) => {
    const cur = summarize(current, st.id, nowHour, partial);
    const prev = summarize(previous, st.id, nowHour, partial);
    const top = Object.entries(cur.byItem).filter(([id]) => !ITEM_BY_ID[id].madeToOrder).sort((a, b) => b[1].revenue - a[1].revenue)[0];
    return {
      store: st,
      revenue: cur.revenue,
      growth: prev.revenue ? cur.revenue / prev.revenue - 1 : 0,
      avgTicket: cur.avgTicket,
      topSeller: top ? ITEM_BY_ID[top[0]].name : '—',
      wasteRate: cur.wasteRate,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function topItems(cur: Summary, prev: Summary, n = 10) {
  const rank = (s: Summary) => Object.entries(s.byItem).sort((a, b) => b[1].revenue - a[1].revenue).map(([id]) => id);
  const curRank = rank(cur);
  const prevRank = rank(prev);
  return curRank.slice(0, n).map((id, i) => {
    const p = prevRank.indexOf(id);
    return { item: ITEM_BY_ID[id], rank: i + 1, change: p === -1 ? 0 : p - i, revenue: cur.byItem[id].revenue, units: cur.byItem[id].units };
  });
}

export interface HourlyRow { hour: number; label: string; today: number | null; projected: number | null; lastWeek: number; anomaly?: string }

/** Revenue by hour for today (actual up to now, projected after) vs same weekday last week. */
export function hourly(store: StoreFilter, nowHour: number): { rows: HourlyRow[]; anomaly: ReturnType<typeof intradayAnomaly> | null } {
  const anomaly = intradayAnomaly(nowHour);
  const dist = (d: number) => {
    const byHour = HOURS.map(() => 0);
    for (const r of pick(salesOn(d), store)) {
      const it = ITEM_BY_ID[r.itemId];
      const curve = [...CURVES[it.category]];
      if (d === 0 && r.storeId === anomaly.storeId && it.category === 'pastries') {
        // Pull a slice of the day's pastries into the pickup hour (total unchanged).
        const idx = anomaly.hour - HOURS[0];
        for (let i = 0; i < curve.length; i++) curve[i] *= 1 - anomaly.share;
        curve[idx] += anomaly.share;
      }
      curve.forEach((w, i) => (byHour[i] += r.revenue * w));
    }
    return byHour;
  };
  const today = dist(0);
  const last = dist(-7);
  const nowIdx = Math.floor(nowHour) - HOURS[0];
  const showAnomaly = (store === 'all' || store === anomaly.storeId) && anomaly.hour < Math.floor(nowHour);
  const rows = HOURS.map((h, i) => ({
    hour: h,
    label: fmtHour(h),
    today: i < nowIdx ? today[i] : null,
    projected: i >= nowIdx - 1 ? today[i] : null,
    lastWeek: last[i],
    anomaly: showAnomaly && h === anomaly.hour ? anomaly.label : undefined,
  }));
  return { rows, anomaly: showAnomaly ? anomaly : null };
}

// --------------------------------------------------------------------------- Forecast
function futureStoreItem(storeId: string, itemId: string, d: number, whatIf: WhatIf) {
  return expectedUnits(STORE_BY_ID[storeId], ITEM_BY_ID[itemId], DAY_CONTEXT[d], whatIf);
}

export function forecastSeries(store: StoreFilter, whatIf: WhatIf): ForecastPoint[] {
  const stores = store === 'all' ? STORES : [STORE_BY_ID[store]];
  const pts: ForecastPoint[] = [];
  for (let d = -13; d <= 0; d++) {
    const rows = pick(salesOn(d), store);
    const actual = rows.reduce((a, r) => a + r.revenue, 0);
    const forecast = forecastRevenue(rows);
    const anomaly = ANOMALIES.find((a) => a.d === d && (store === 'all' || a.storeId === null || a.storeId === store));
    pts.push({ d, label: d === 0 ? 'Today' : fmtDayShort(dateFor(d)), actual, forecast, band: [forecast * 0.95, forecast * 1.05], isToday: d === 0, anomaly });
  }
  for (let d = 1; d <= FUTURE_DAYS; d++) {
    let forecast = 0;
    for (const st of stores) for (const it of ITEMS) {
      const { units, priceFactor } = futureStoreItem(st.id, it.id, d, whatIf);
      forecast += units * it.price * priceFactor;
    }
    const spread = 0.05 + 0.006 * d;
    pts.push({ d, label: fmtDayShort(dateFor(d)), actual: null, forecast, band: [forecast * (1 - spread), forecast * (1 + spread)], isToday: false });
  }
  return pts;
}

export function forecastDrivers() {
  return Array.from({ length: FUTURE_DAYS }, (_, i) => DAY_CONTEXT[i + 1]);
}

/** Model recommendation for tomorrow, before any user edits. */
export function baseBakePlan(storeId: string, whatIf: WhatIf): BakePlanItem[] {
  const lastWeek = salesOn(-6).filter((r) => r.storeId === storeId); // same weekday as tomorrow
  return BAKED_ITEMS.map((it) => {
    const { units } = futureStoreItem(storeId, it.id, 1, whatIf);
    const lw = lastWeek.find((r) => r.itemId === it.id)!;
    const recommended = Math.ceil(units * (1 + SAFETY_BUFFER));
    return { storeId, itemId: it.id, recommended, lastBaked: lw.baked, lastSold: lw.sold, planned: recommended, accepted: false, source: 'model' };
  });
}

// --------------------------------------------------------------------------- Waste
export function wasteTrend(store: StoreFilter, n = 30): WasteEntry[] {
  return Array.from({ length: n }, (_, i) => {
    const d = -n + i;
    const s = summarize([d], store, 24);
    return { d, label: fmtDay(dateFor(d)), units: s.wasted, value: s.wasteValue, rate: s.wasteRate };
  });
}

/** Average wasted units per item × weekday over the last 12 weeks. */
export function wasteHeatmap(store: StoreFilter, topN = 8) {
  const grid: Record<string, number[]> = {};
  const counts = Array(7).fill(0);
  for (let d = -84; d <= -1; d++) {
    const dow = dateFor(d).getDay();
    counts[dow]++;
    for (const r of pick(salesOn(d), store)) {
      if (ITEM_BY_ID[r.itemId].madeToOrder) continue;
      (grid[r.itemId] ??= Array(7).fill(0))[dow] += r.wasted;
    }
  }
  const rows = Object.entries(grid)
    .map(([id, arr]) => ({ item: ITEM_BY_ID[id], values: arr.map((v, i) => v / counts[i]) }))
    .sort((a, b) => b.values.reduce((x, y) => x + y, 0) - a.values.reduce((x, y) => x + y, 0))
    .slice(0, topN);
  // Monday-first column order reads more naturally for an ops week.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return { rows: rows.map((r) => ({ item: r.item, values: order.map((i) => r.values[i]) })), dows: order };
}

const DISPOSITION_SPLIT: Record<WasteReason, Record<Disposition, number>> = {
  overproduction: { donated: 0.5, bundled: 0.4, composted: 0.08, binned: 0.02 },
  expired: { donated: 0.1, bundled: 0.15, composted: 0.55, binned: 0.2 },
  damaged: { donated: 0, bundled: 0, composted: 0.6, binned: 0.4 },
  quality: { donated: 0, bundled: 0, composted: 0.5, binned: 0.5 },
};
export function rescueLedger(s: Summary) {
  const out: Record<Disposition, number> = { donated: 0, bundled: 0, composted: 0, binned: 0 };
  for (const r of REASONS) for (const [k, share] of Object.entries(DISPOSITION_SPLIT[r])) out[k as Disposition] += s.reasons[r] * share;
  for (const k of Object.keys(out) as Disposition[]) out[k] = Math.round(out[k]);
  const meals = Math.round(out.donated * 0.75);
  const co2 = Math.round((out.donated + out.bundled) * 0.42 + out.composted * 0.18);
  const rescued = s.wasted ? (out.donated + out.bundled) / s.wasted : 0;
  return { dispositions: out, meals, co2, rescued };
}

/** Items on the shelf right now with time left before markdown. */
export function freshness(storeId: string, now: Date) {
  // Outside opening hours, show the shelf as it looked mid-afternoon.
  const raw = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const nowH = raw < 6.5 || raw > 19.5 ? 15.5 : raw;
  const today = salesOn(0).filter((r) => r.storeId === storeId);
  return BAKED_ITEMS.map((it) => {
    const r = today.find((x) => x.itemId === it.id)!;
    // Each item is baked in batches from ~5 AM; batch spacing is seeded per store/item.
    const interval = it.shelfLifeHrs * (0.7 + 0.5 * rand('batch', storeId, it.id));
    const first = 5 + rand('first', storeId, it.id);
    const lastBatch = first + Math.floor((nowH - first) / interval) * interval;
    const ageHrs = nowH - lastBatch;
    const progress = Math.min(1, ageHrs / it.shelfLifeHrs);
    const markdownInHrs = Math.max(0, it.shelfLifeHrs - ageHrs);
    const batchSize = r.baked * (interval / (14 + interval));
    const onShelf = Math.max(2, Math.round(batchSize * (1 - 0.8 * progress)));
    return { item: it, progress, markdownInHrs, onShelf, bakedAt: lastBatch };
  }).sort((a, b) => a.markdownInHrs - b.markdownInHrs);
}

// --------------------------------------------------------------------------- Insights
export function generateInsights(whatIf: WhatIf): Insight[] {
  const insights: Insight[] = [];
  const tomorrowName = WEEKDAYS_LONG[TOMORROW_DOW];
  const sameDow = [-6, -13, -20, -27];

  // 1) Chronic overbake on tomorrow's weekday.
  let worst: { storeId: string; itemId: string; rate: number; sold: number; baked: number } | null = null;
  for (const st of STORES) for (const it of BAKED_ITEMS) {
    const rows = sameDow.map((d) => salesOn(d).find((r) => r.storeId === st.id && r.itemId === it.id)!);
    const rates = rows.map((r) => (r.baked ? r.wasted / r.baked : 0));
    if (rates.every((x) => x > 0.2)) {
      const rate = rates.reduce((a, b) => a + b, 0) / rates.length;
      if (!worst || rate > worst.rate) worst = { storeId: st.id, itemId: it.id, rate, sold: rows.reduce((a, r) => a + r.sold, 0) / 4, baked: rows[0].baked };
    }
  }
  if (worst) {
    const st = STORE_BY_ID[worst.storeId];
    const it = ITEM_BY_ID[worst.itemId];
    const qty = Math.round(worst.sold * 1.05);
    const pct = qty / worst.baked - 1;
    insights.push({
      id: 'overbake', tone: 'waste', storeId: st.id,
      title: `${st.short} overbaked ${it.name.toLowerCase()} 4 ${tomorrowName}s in a row`,
      body: `On average ${Math.round(worst.rate * 100)}% went unsold. Suggest −${Math.abs(Math.round(pct * 100))}% tomorrow (${qty} vs ${worst.baked} last ${tomorrowName}).`,
      why: [
        `Last 4 ${tomorrowName}s: avg ${Math.round(worst.sold)} sold, ${worst.baked} baked last week.`,
        `Bake sheet at ${st.name} appears to use a fixed ${tomorrowName} par instead of the forecast.`,
        `Saves ≈ $${Math.round((worst.baked - qty) * it.unitCost)} in ingredients per ${tomorrowName}.`,
      ],
      actions: [{ itemId: it.id, qty }],
      actionLabel: 'Apply to Bake Plan',
    });
  }

  // 2) Repeated early sell-outs.
  let stockout: { storeId: string; itemId: string; hour: number; demand: number; days: number } | null = null;
  for (const st of STORES) for (const it of BAKED_ITEMS) {
    const rows = [-1, -2, -3, -4].map((d) => salesOn(d).find((r) => r.storeId === st.id && r.itemId === it.id)!);
    const outs = rows.filter((r) => r.soldOutHour !== null && r.soldOutHour < 16);
    if (outs.length >= 3) {
      const hour = outs.reduce((a, r) => a + r.soldOutHour!, 0) / outs.length;
      if (!stockout || hour < stockout.hour) stockout = { storeId: st.id, itemId: it.id, hour, demand: rows.reduce((a, r) => a + r.demand, 0) / 4, days: outs.length };
    }
  }
  if (stockout) {
    const st = STORE_BY_ID[stockout.storeId];
    const it = ITEM_BY_ID[stockout.itemId];
    const base = baseBakePlan(st.id, whatIf).find((b) => b.itemId === it.id)!;
    const qty = Math.round(Math.max(base.recommended, stockout.demand) * 1.08);
    insights.push({
      id: 'stockout', tone: 'stockout', storeId: st.id,
      title: `${st.short} sold out of ${it.name.toLowerCase()}s by ${fmtHour(Math.round(stockout.hour * 6) / 6)}`,
      body: `Happened ${stockout.days} of the last 4 days. Suggest +${Math.round((qty / base.lastBaked - 1) * 100)}% tomorrow (${qty} units).`,
      why: [
        `Estimated unmet demand ≈ ${Math.round(stockout.demand - base.lastBaked)} units/day (${'$'}${Math.round((stockout.demand - base.lastBaked) * it.price)} lost sales).`,
        `Customers arriving after the sell-out switch to plain croissants about 40% of the time.`,
        `Waste risk is low: this item has a ${it.shelfLifeHrs}-hour shelf life and sells through by mid-afternoon.`,
      ],
      actions: [{ itemId: it.id, qty }],
      actionLabel: 'Apply to Bake Plan',
    });
  }

  // 3) Expired-waste spike (shelf rotation problem).
  {
    const recent = summarize(Array.from({ length: 14 }, (_, i) => -1 - i), 's5', 24);
    const prior = summarize(Array.from({ length: 14 }, (_, i) => -15 - i), 's5', 24);
    const lift = prior.reasons.expired ? recent.reasons.expired / prior.reasons.expired - 1 : 0;
    const base = baseBakePlan('s5', whatIf).find((b) => b.itemId === 'eggtart')!;
    const qty = Math.round(base.recommended * 0.9);
    insights.push({
      id: 'expired', tone: 'ops', storeId: 's5',
      title: `Expired waste at Store 5 is up ${Math.round(lift * 100)}% in 2 weeks`,
      body: `Mostly egg tarts. Check display rotation (FIFO) and trim tomorrow's egg tarts 10% to ${qty}.`,
      why: [
        `Expired units: ${recent.reasons.expired} (last 14 days) vs ${prior.reasons.expired} (prior 14).`,
        `Egg tart bake has run ~10% over forecast at Eastgate since a schedule change.`,
        `Moving the markdown one hour earlier would convert part of this to discount-bundle sales.`,
      ],
      actions: [{ itemId: 'eggtart', qty }],
      actionLabel: 'Apply to Bake Plan',
    });
  }

  // 4) Busiest store tomorrow: accept everything in one go.
  {
    const ranked = STORES.map((st) => {
      const plan = baseBakePlan(st.id, whatIf);
      let rev = 0;
      for (const it of ITEMS) {
        const { units, priceFactor } = futureStoreItem(st.id, it.id, 1, whatIf);
        rev += units * it.price * priceFactor;
      }
      const lift = plan.reduce((a, p) => a + p.recommended, 0) / plan.reduce((a, p) => a + p.lastBaked, 0) - 1;
      return { st, plan, rev, lift };
    }).sort((a, b) => b.rev - a.rev)[0];
    const ctx = DAY_CONTEXT[1];
    const drivers = [ctx.event, ctx.promo, ctx.weather === 'rain' ? `rain (${Math.round(ctx.rainChance * 100)}%)` : ctx.weather, `${ctx.tempF}°F`].filter(Boolean);
    const units = ranked.plan.reduce((a, p) => a + p.recommended, 0);
    insights.push({
      id: 'busiest', tone: 'opportunity', storeId: ranked.st.id,
      title: `${ranked.st.name} is tomorrow's busiest store ($${Math.round(ranked.rev).toLocaleString('en-US')} forecast)`,
      body: `Model plans ${units.toLocaleString('en-US')} baked units (${ranked.lift >= 0 ? '+' : '−'}${Math.abs(Math.round(ranked.lift * 100))}% vs last ${tomorrowName}). Accept all ${ranked.plan.length} recommendations in one go.`,
      why: [`Tomorrow's drivers: ${drivers.join(', ')}.`, `Includes a ${Math.round(SAFETY_BUFFER * 100)}% safety buffer over forecast demand.`, 'Consider one extra early baker shift if the total rises more than 10%.'],
      actions: ranked.plan.map((p) => ({ itemId: p.itemId, qty: p.recommended })),
      actionLabel: 'Accept all for store',
    });
  }
  return insights;
}
