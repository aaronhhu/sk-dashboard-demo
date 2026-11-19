import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Insight, RangeKey } from '../types';
import type { StoreFilter } from '../lib/aggregate';
import type { WhatIf } from '../data/mockData';
import { STORES } from '../data/mockData';

interface PlanEdit { qty: number; accepted: boolean; source: 'manual' | 'assistant' | 'model' }

interface FilterState {
  store: StoreFilter;
  setStore: (s: StoreFilter) => void;
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  dark: boolean;
  toggleDark: () => void;
  whatIf: WhatIf;
  setWhatIf: (w: WhatIf) => void;
  /** Wall clock, ticks every 15 s. */
  now: Date;
  /** Fractional hour used for "as of now" sales, rounded so charts don't recompute every tick. */
  nowHour: number;
  lastSync: Date;
  syncing: boolean;
  refresh: () => void;
  loading: boolean;
  // Bake plan (tomorrow)
  planStore: string;
  setPlanStore: (s: string) => void;
  planEdits: Record<string, PlanEdit>;
  setPlanQty: (storeId: string, itemId: string, qty: number) => void;
  toggleAccepted: (storeId: string, itemId: string, recommendedQty: number) => void;
  acceptAll: (storeId: string, items: { itemId: string; qty: number }[]) => void;
  appliedInsights: string[];
  applyInsight: (ins: Insight) => void;
  highlight: string[];
}

const Ctx = createContext<FilterState | null>(null);
export const planKey = (storeId: string, itemId: string) => `${storeId}:${itemId}`;

export function FilterProvider({ children }: { children: ReactNode }) {
  const [store, setStoreRaw] = useState<StoreFilter>('all');
  const [range, setRange] = useState<RangeKey>('today');
  const [dark, setDark] = useState(false);
  const [whatIf, setWhatIf] = useState<WhatIf>({ discount: 0, tempOffset: 0 });
  const [now, setNow] = useState(() => new Date());
  const [lastSync, setLastSync] = useState(() => new Date());
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planStore, setPlanStore] = useState(STORES[0].id);
  const [planEdits, setPlanEdits] = useState<Record<string, PlanEdit>>({});
  const [appliedInsights, setApplied] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900); // show skeletons briefly
    const i = setInterval(() => setNow(new Date()), 15000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const setStore = useCallback((s: StoreFilter) => {
    setStoreRaw(s);
    if (s !== 'all') setPlanStore(s);
  }, []);

  const refresh = useCallback(() => {
    setSyncing(true);
    setTimeout(() => { setLastSync(new Date()); setNow(new Date()); setSyncing(false); }, 700);
  }, []);

  const flash = (keys: string[]) => {
    setHighlight(keys);
    setTimeout(() => setHighlight([]), 2400);
  };

  const setPlanQty = useCallback((storeId: string, itemId: string, qty: number) => {
    setPlanEdits((p) => ({ ...p, [planKey(storeId, itemId)]: { qty: Math.max(0, qty), accepted: false, source: 'manual' } }));
  }, []);

  const toggleAccepted = useCallback((storeId: string, itemId: string, recommendedQty: number) => {
    setPlanEdits((p) => {
      const k = planKey(storeId, itemId);
      const cur = p[k] ?? { qty: recommendedQty, accepted: false, source: 'model' as const };
      return { ...p, [k]: { ...cur, accepted: !cur.accepted } };
    });
  }, []);

  const acceptAll = useCallback((storeId: string, items: { itemId: string; qty: number }[]) => {
    setPlanEdits((p) => {
      const next = { ...p };
      for (const it of items) {
        const k = planKey(storeId, it.itemId);
        next[k] = { qty: next[k]?.qty ?? it.qty, accepted: true, source: next[k]?.source ?? 'model' };
      }
      return next;
    });
  }, []);

  const applyInsight = useCallback((ins: Insight) => {
    setPlanEdits((p) => {
      const next = { ...p };
      for (const a of ins.actions) next[planKey(ins.storeId, a.itemId)] = { qty: a.qty, accepted: true, source: 'assistant' };
      return next;
    });
    setApplied((a) => [...a, ins.id]);
    setPlanStore(ins.storeId);
    flash(ins.actions.map((a) => planKey(ins.storeId, a.itemId)));
    document.getElementById('bake-plan')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const nowHour = Math.round((now.getHours() + now.getMinutes() / 60) * 10) / 10;

  const value = useMemo<FilterState>(() => ({
    store, setStore, range, setRange, dark, toggleDark: () => setDark((d) => !d), whatIf, setWhatIf,
    now, nowHour, lastSync, syncing, refresh, loading,
    planStore, setPlanStore, planEdits, setPlanQty, toggleAccepted, acceptAll, appliedInsights, applyInsight, highlight,
  }), [store, setStore, range, dark, whatIf, now, nowHour, lastSync, syncing, refresh, loading, planStore, planEdits, setPlanQty, toggleAccepted, acceptAll, appliedInsights, applyInsight, highlight]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFilters must be used inside <FilterProvider>');
  return v;
}
