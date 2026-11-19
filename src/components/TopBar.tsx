import { ChevronDown, Croissant, Moon, RefreshCw, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BAKERY_NAME } from '../config';
import { useFilters } from '../context/FilterContext';
import { STORES } from '../data/mockData';
import { RANGE_LABELS } from '../lib/aggregate';
import type { RangeKey } from '../types';
import { Segmented } from './ui/primitives';

function useAgo(date: Date) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

export function TopBar() {
  const { store, setStore, range, setRange, dark, toggleDark, lastSync, syncing, refresh, now } = useFilters();
  const ago = useAgo(lastSync);
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="sticky top-0 z-30 border-b border-peachBorder/80 bg-cream/80 backdrop-blur-md dark:border-cocoa-border dark:bg-cocoa/80">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="mr-auto flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-tangerine to-burntSugar text-white shadow-soft">
            <Croissant size={22} strokeWidth={2.2} aria-hidden />
          </div>
          <div>
            <div className="font-display text-lg font-semibold leading-tight">{BAKERY_NAME}</div>
            <div className="subtle text-xs">Operations · {dateLabel}</div>
          </div>
        </div>

        <label className="relative">
          <span className="sr-only">Store</span>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="appearance-none rounded-full border border-peachBorder bg-white py-1.5 pl-3 pr-8 text-xs font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-burntSugar/60 dark:border-cocoa-border dark:bg-cocoa-card"
          >
            <option value="all">All stores ({STORES.length})</option>
            {STORES.map((s) => (
              <option key={s.id} value={s.id}>{s.short} · {s.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        </label>

        <Segmented<RangeKey>
          label="Date range"
          value={range}
          onChange={setRange}
          options={(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => ({ value: k, label: RANGE_LABELS[k] }))}
        />

        <button onClick={refresh} className="btn subtle hover:bg-peachBorder/50 dark:hover:bg-cocoa-border" title="Sync now">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sage-ink" />
          </span>
          <span className="tabular">Last sync {syncing ? '…' : ago}</span>
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} aria-hidden />
        </button>

        <button
          onClick={toggleDark}
          className="btn border border-peachBorder bg-white hover:bg-butter/60 dark:border-cocoa-border dark:bg-cocoa-card dark:hover:bg-cocoa-border"
          aria-pressed={dark}
        >
          {dark ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
          {dark ? 'Day Shift' : 'Night Shift'}
        </button>
      </div>
    </header>
  );
}
