# Golden Hour Bakehouse · Ops Dashboard (demo)

An interactive operations dashboard demo for a six-store bakery chain: store sales, a 14-day sales forecast with a bake plan, and waste management. It runs entirely on seeded mock data, so there is no backend.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, then builds to `dist/` |
| `npm run build:single` | Builds one self-contained `dist-single/index.html` you can email or open from disk |
| `npm run typecheck` | Runs `tsc --noEmit` |

## Stack

Vite + React 18 + TypeScript, Tailwind CSS (palette in `tailwind.config.js`, `darkMode: 'class'`), Recharts, Framer Motion, lucide-react. State is React Context + hooks only.

## Where things live

```
src/
  config.ts                 Bakery name, chart colors, waste target, safety buffer
  types.ts                  Sale, ForecastPoint, WasteEntry, BakePlanItem, Insight, ...
  data/
    rng.ts                  Seeded random (same numbers on every reload)
    mockData.ts             Stores, items, calendar (weather, holidays, promos), demand model
  lib/
    aggregate.ts            Pure functions: summaries, forecast, bake plan, waste, insights
    format.ts               Money/percent/date helpers
  context/FilterContext.tsx Store + date-range filters, Night Shift, what-if, bake-plan edits
  hooks/useDashboardData.ts useMemo wrappers around lib/aggregate
  components/
    TopBar.tsx
    kpi/        KPI tiles with sparklines, Daily Bake Score gauge
    sales/      Hourly curve, category treemap, store leaderboard, top 10 items
    forecast/   14-day forecast + what-if sliders, drivers panel, Bake Plan table
    waste/      Trend, reasons, heatmap, Rescue Ledger, freshness strip
    insights/   Ops Assistant cards ("Why?" + "Apply to Bake Plan")
```

## How the numbers stay consistent

A single demand model in `mockData.ts` generates every store × item × day for the past 182 days:

- **Expected units** = item base × store scale × weekday × trend × weather × event × promo
- **Forecast** = expected units ± model error. The forecast never sees anomalies.
- **Actual demand** = expected units × anomaly ± noise
- **Baked** = forecast × 1.06 buffer × store habit; **sold** = min(demand, baked); **wasted** = the remainder

Every panel aggregates these same records. For example, the hourly chart's area sums to today's net sales, waste reasons sum to the waste units, and the bake plan's "last Friday" column matches the history. Today's sales are scaled to the current time using the hourly curves. Today's waste and sell-through are full-day projections.

Patterns planted for the Ops Assistant to find:
- Old Mill bakes a fixed sourdough par on tomorrow's weekday
- Midtown under-bakes almond croissants
- Eastgate's egg-tart expiries rose over the last two weeks

Anomalies, shown as pulsing dots:
- A street closure
- A viral social post
- A POS outage
- A field-trip pickup on today's hourly chart

## Swapping in a real API

Keep the shapes in `types.ts` and replace what `mockData.ts` exports (`STORES`, `ITEMS`, `salesOn(d)`, `DAY_CONTEXT`, `expectedUnits`) with API calls. The aggregation and UI layers don't need to change.
# sk-dashboard-demo
