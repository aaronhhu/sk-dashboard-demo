// Derived data hooks. Each wraps pure functions from lib/aggregate.ts in useMemo,
// keyed on the filters it actually depends on.
import { useMemo } from 'react';
import { useFilters, planKey } from '../context/FilterContext';
import {
  bakeScore, baseBakePlan, forecastDrivers, forecastSeries, freshness, generateInsights, hourly, leaderboard,
  periodDays, rescueLedger, sparkSeries, summarize, topItems, wasteHeatmap, wasteTrend,
} from '../lib/aggregate';
import type { BakePlanItem } from '../types';

export function useSummary() {
  const { store, range, nowHour } = useFilters();
  return useMemo(() => {
    const { current, previous, partial } = periodDays(range);
    const cur = summarize(current, store, nowHour, partial);
    const prev = summarize(previous, store, nowHour, partial);
    return { cur, prev, score: bakeScore(cur), prevScore: bakeScore(prev) };
  }, [store, range, nowHour]);
}

export function useSparklines() {
  const { store } = useFilters();
  return useMemo(() => sparkSeries(store), [store]);
}

export function useSales() {
  const { store, range, nowHour } = useFilters();
  const { cur, prev } = useSummary();
  return useMemo(() => ({
    hourly: hourly(store, nowHour),
    leaderboard: leaderboard(range, nowHour),
    topItems: topItems(cur, prev),
    byCategory: cur.byCategory,
  }), [store, range, nowHour, cur, prev]);
}

export function useForecast() {
  const { store, whatIf } = useFilters();
  return useMemo(() => ({ series: forecastSeries(store, whatIf), drivers: forecastDrivers() }), [store, whatIf]);
}

/** Tomorrow's bake plan for the selected plan store, with the user's edits merged in. */
export function useBakePlan(): BakePlanItem[] {
  const { planStore, whatIf, planEdits } = useFilters();
  const base = useMemo(() => baseBakePlan(planStore, whatIf), [planStore, whatIf]);
  return useMemo(() => base.map((b) => {
    const e = planEdits[planKey(b.storeId, b.itemId)];
    return e ? { ...b, planned: e.qty, accepted: e.accepted, source: e.source } : b;
  }), [base, planEdits]);
}

export function useWaste() {
  const { store, now } = useFilters();
  const { cur } = useSummary();
  const fixed = useMemo(() => ({ trend: wasteTrend(store), heatmap: wasteHeatmap(store) }), [store]);
  const rescue = useMemo(() => rescueLedger(cur), [cur]);
  const quarter = useMemo(() => rescueLedger(summarize(periodDays('quarter').current, store, 24)), [store]);
  const shelfStore = store === 'all' ? 's1' : store;
  const shelf = useMemo(() => freshness(shelfStore, now), [shelfStore, now]);
  return { ...fixed, rescue, quarter, shelf, shelfStore, reasons: cur.reasons, wasted: cur.wasted };
}

export function useInsights() {
  const { whatIf } = useFilters();
  return useMemo(() => generateInsights(whatIf), [whatIf]);
}
