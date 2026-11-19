import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, ChefHat, Cloud, CloudRain, CloudSun, Minus, PartyPopper, Plus, RotateCcw, Sparkles, Sun, Tag, Thermometer,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CATEGORY_COLORS, chartTheme } from '../../config';
import { planKey, useFilters } from '../../context/FilterContext';
import { useBakePlan, useForecast } from '../../hooks/useDashboardData';
import { ITEM_BY_ID, STORES, STORE_BY_ID, TOMORROW_DOW, weatherImpact } from '../../data/mockData';
import { forecastSeries } from '../../lib/aggregate';
import { WEEKDAYS_LONG, fmtDayShort, fmtInt, fmtMoney, fmtSignedPct } from '../../lib/format';
import type { DayContext, Weather } from '../../types';
import { Card, PulseDot, SectionHeader, TooltipBox } from '../ui/primitives';
import { Legend } from '../sales/SalesSection';

// --------------------------------------------------------------------------- Forecast chart + what-if
function ForecastChart() {
  const { dark, store, whatIf, setWhatIf } = useFilters();
  const { series } = useForecast();
  const th = chartTheme(dark);
  const baseline = useMemo(() => forecastSeries(store, { discount: 0, tempOffset: 0 }), [store]);
  const future = series.filter((p) => p.d > 0);
  const total = future.reduce((a, p) => a + p.forecast, 0);
  const baseTotal = baseline.filter((p) => p.d > 0).reduce((a, p) => a + p.forecast, 0);
  const changed = whatIf.discount > 0 || whatIf.tempOffset !== 0;
  const data = series.map((p, i) => ({ ...p, baseline: changed && p.d > 0 ? baseline[i].forecast : null }));

  return (
    <Card className="lg:col-span-2" title="14-day sales forecast" skeletonHeight={300}
      subtitle="Past 14 days: actual vs forecast. Next 14 days: forecast with confidence band.">
      <div className="h-72">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 12, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid stroke={th.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: th.axis, fontSize: 10.5 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fill: th.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip cursor={{ stroke: th.axis, strokeDasharray: 3 }} content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof data)[number];
              return (
                <TooltipBox title={label} rows={[
                  ...(p.actual != null ? [{ label: p.isToday ? 'Actual (proj.)' : 'Actual', value: fmtMoney(p.actual), color: '#E07A3F' }] : []),
                  { label: 'Forecast', value: fmtMoney(p.forecast), color: '#B08968', dashed: true },
                  ...(p.d > 0 ? [{ label: 'Range', value: `${fmtMoney(p.band[0], true)}–${fmtMoney(p.band[1], true)}` }] : []),
                  ...(p.baseline != null ? [{ label: 'Before what-if', value: fmtMoney(p.baseline), color: th.lastWeek, dashed: true }] : []),
                  ...(p.actual != null ? [{ label: 'Error', value: fmtSignedPct(p.actual / p.forecast - 1) }] : []),
                ]} note={p.anomaly ? <><b>⚡ {p.anomaly.label}.</b> {p.anomaly.detail}</> : undefined} />
              );
            }} />
            <Area dataKey="band" stroke="none" fill={th.band} isAnimationActive={false} />
            {changed && <Line dataKey="baseline" stroke={th.lastWeek} strokeDasharray="3 3" strokeWidth={1.5} dot={false} />}
            <Line dataKey="forecast" stroke="#B08968" strokeWidth={2} strokeDasharray="6 4" dot={false} />
            <Line dataKey="actual" stroke="#E07A3F" strokeWidth={2.5} dot={{ r: 2.5, fill: '#E07A3F' }} connectNulls={false} />
            <ReferenceLine x="Today" stroke={th.axis} strokeDasharray="2 2" label={{ value: 'today', fill: th.axis, fontSize: 10, position: 'top' }} />
            {data.filter((p) => p.anomaly && p.actual != null).map((p) => (
              <ReferenceDot key={p.d} x={p.label} y={p.actual!} shape={(s: object) => <PulseDot {...s} />} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[
        { label: 'Actual', color: '#E07A3F' }, { label: 'Forecast', color: '#B08968', dashed: true },
        { label: 'Confidence band', color: '#FFCBA4' }, { label: 'Anomaly (hover)', color: '#E07A3F', dot: true },
      ]} />

      {/* What-if controls */}
      <div className="mt-4 grid gap-4 rounded-xl bg-cream p-3 sm:grid-cols-[1fr_1fr_auto] dark:bg-cocoa/50">
        <label className="text-xs">
          <span className="flex items-center justify-between font-semibold">
            <span className="inline-flex items-center gap-1"><Tag size={13} /> Promo discount (baked goods)</span>
            <span className="tabular text-burntSugar">{Math.round(whatIf.discount * 100)}%</span>
          </span>
          <input type="range" min={0} max={30} step={5} value={whatIf.discount * 100} className="mt-1 w-full"
            onChange={(e) => setWhatIf({ ...whatIf, discount: Number(e.target.value) / 100 })} aria-label="Promo discount percent" />
        </label>
        <label className="text-xs">
          <span className="flex items-center justify-between font-semibold">
            <span className="inline-flex items-center gap-1"><Thermometer size={13} /> Temperature vs forecast</span>
            <span className="tabular text-burntSugar">{whatIf.tempOffset > 0 ? '+' : ''}{whatIf.tempOffset}°F</span>
          </span>
          <input type="range" min={-20} max={30} step={5} value={whatIf.tempOffset} className="mt-1 w-full"
            onChange={(e) => setWhatIf({ ...whatIf, tempOffset: Number(e.target.value) })} aria-label="Temperature offset" />
        </label>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:justify-center">
          <div className="text-right">
            <div className="subtle text-[11px]">Next 14 days</div>
            <div className="font-display text-lg font-semibold tabular">{fmtMoney(total, true)}</div>
            {changed && <div className="text-[11px] font-semibold tabular">{fmtSignedPct(total / baseTotal - 1)} vs base</div>}
          </div>
          {changed && <button className="btn bg-white hover:bg-butter dark:bg-cocoa-card" onClick={() => setWhatIf({ discount: 0, tempOffset: 0 })}><RotateCcw size={12} /> Reset</button>}
        </div>
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- Drivers
const WX_ICON: Record<Weather, typeof Sun> = { sunny: Sun, partly: CloudSun, cloudy: Cloud, rain: CloudRain };
const WX_LABEL: Record<Weather, string> = { sunny: 'Sunny', partly: 'Partly cloudy', cloudy: 'Cloudy', rain: 'Rain' };

/** onLight: the tag sits on a light chip in both themes, so always use the dark ink colors. */
function ImpactTag({ v, onLight }: { v: number; onLight?: boolean }) {
  if (Math.abs(v) < 0.005) return <span className={`text-[11px] tabular ${onLight ? 'text-muted' : 'subtle'}`}>±0%</span>;
  const tone = v > 0
    ? onLight ? 'text-sage-ink' : 'text-sage-ink dark:text-sage'
    : onLight ? 'text-terracotta-ink' : 'text-terracotta-ink dark:text-terracotta';
  return <span className={`text-[11px] font-semibold tabular ${tone}`}>{fmtSignedPct(v, 0)}</span>;
}

function DriverRow({ c }: { c: DayContext }) {
  const { whatIf } = useFilters();
  const Icon = WX_ICON[c.weather];
  const temp = c.tempF + whatIf.tempOffset;
  const wx = weatherImpact(c, whatIf.tempOffset);
  return (
    <li className="grid grid-cols-[52px_1fr] gap-2 border-t border-peachBorder/70 py-2 first:border-0 dark:border-cocoa-border">
      <div>
        <div className="text-xs font-semibold">{fmtDayShort(c.date)}</div>
        <div className="subtle mt-0.5 flex items-center gap-1 text-[11px]" title={WX_LABEL[c.weather]}>
          <Icon size={14} className={c.weather === 'rain' ? 'text-latte' : 'text-apricot'} aria-label={WX_LABEL[c.weather]} />
          <span className="tabular">{temp}°</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip bg-cream dark:bg-cocoa/60">{WX_LABEL[c.weather]}{c.weather === 'rain' ? ` ${Math.round(c.rainChance * 100)}%` : ''} <ImpactTag v={wx} /></span>
        {c.event && <span className="chip bg-butter text-espresso"><PartyPopper size={11} /> {c.event} <ImpactTag v={c.eventImpact} onLight /></span>}
        {c.promo && <span className="chip bg-peach text-espresso"><Tag size={11} /> {c.promo} <ImpactTag v={c.promoImpact} onLight /></span>}
      </div>
    </li>
  );
}

function DriversPanel() {
  const { drivers } = useForecast();
  return (
    <Card title="Forecast drivers" subtitle="Weather, holidays & local events, promotions · est. impact on sales" skeletonHeight={300} delay={0.05}>
      <ul className="max-h-[420px] overflow-y-auto pr-1">
        {drivers.map((c) => <DriverRow key={c.d} c={c} />)}
      </ul>
    </Card>
  );
}

// --------------------------------------------------------------------------- Bake plan
function BakePlanTable() {
  const { planStore, setPlanStore, setPlanQty, toggleAccepted, acceptAll, highlight } = useFilters();
  const plan = useBakePlan();
  const tomorrow = WEEKDAYS_LONG[TOMORROW_DOW];
  const totals = plan.reduce((a, p) => ({ planned: a.planned + p.planned, last: a.last + p.lastBaked, accepted: a.accepted + (p.accepted ? 1 : 0) }), { planned: 0, last: 0, accepted: 0 });
  const cost = plan.reduce((a, p) => a + p.planned * ITEM_BY_ID[p.itemId].unitCost, 0);

  return (
    <Card id="bake-plan" className="lg:col-span-3" skeletonHeight={320} delay={0.05}
      title={<span className="inline-flex items-center gap-2"><ChefHat size={18} className="text-burntSugar" /> Bake Plan · {tomorrow}</span>}
      subtitle={`Recommended production for tomorrow at ${STORE_BY_ID[planStore].name}: forecast demand + 6% buffer, compared with last ${tomorrow}.`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-cream tabular dark:bg-cocoa/60">{totals.accepted}/{plan.length} accepted</span>
          <span className="chip bg-cream tabular dark:bg-cocoa/60">{fmtInt(totals.planned)} units · {fmtSignedPct(totals.planned / totals.last - 1)} vs last {tomorrow.slice(0, 3)}</span>
          <span className="chip bg-cream tabular dark:bg-cocoa/60">~{fmtMoney(cost)} ingredients</span>
          <button className="btn bg-burntSugar text-white hover:bg-[#c96a33]" onClick={() => acceptAll(planStore, plan.map((p) => ({ itemId: p.itemId, qty: p.planned })))}>
            <Check size={13} /> Accept all
          </button>
        </div>
      }>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Bake plan store">
        {STORES.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === planStore} onClick={() => setPlanStore(s.id)}
            className={`btn ${s.id === planStore ? 'bg-espresso text-white dark:bg-cocoa-text dark:text-cocoa' : 'bg-cream hover:bg-butter dark:bg-cocoa/60 dark:hover:bg-cocoa-border'}`}>
            {s.short} · {s.name}
          </button>
        ))}
      </div>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="subtle text-left text-[11px] uppercase tracking-wide">
              <th className="px-2 py-1.5 font-medium">Item</th>
              <th className="px-2 py-1.5 text-right font-medium">Last {tomorrow.slice(0, 3)} baked</th>
              <th className="px-2 py-1.5 text-right font-medium">Sold</th>
              <th className="px-2 py-1.5 text-right font-medium">Recommended</th>
              <th className="px-2 py-1.5 text-center font-medium">Plan</th>
              <th className="px-2 py-1.5 text-right font-medium">Δ vs last</th>
              <th className="px-2 py-1.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((p) => {
              const it = ITEM_BY_ID[p.itemId];
              const flash = highlight.includes(planKey(p.storeId, p.itemId));
              const delta = p.lastBaked ? p.planned / p.lastBaked - 1 : 0;
              const leftover = p.lastBaked - p.lastSold;
              return (
                <motion.tr key={p.itemId} layout
                  animate={{ backgroundColor: flash ? 'rgba(255,229,180,0.9)' : 'rgba(0,0,0,0)' }}
                  transition={{ duration: 0.4 }}
                  className="border-t border-peachBorder/70 dark:border-cocoa-border">
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[it.category] }} />
                      <span className="font-medium">{it.name}</span>
                      {p.source === 'assistant' && <span className="chip bg-butter text-espresso"><Sparkles size={10} /> Assistant</span>}
                      {p.source === 'manual' && <span className="chip bg-cream subtle dark:bg-cocoa/60">Edited</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular">{p.lastBaked}</td>
                  <td className="px-2 py-2 text-right tabular">
                    {p.lastSold}
                    {leftover > 0 && <span className="subtle ml-1 text-[11px]">({leftover} left)</span>}
                    {leftover === 0 && <span className="ml-1 text-[11px] font-semibold text-terracotta-ink dark:text-terracotta">sold out</span>}
                  </td>
                  <td className="px-2 py-2 text-right font-medium tabular">{p.recommended}</td>
                  <td className="px-2 py-2">
                    <div className="mx-auto flex w-fit items-center rounded-full border border-peachBorder bg-white dark:border-cocoa-border dark:bg-cocoa">
                      <button className="grid h-7 w-7 place-items-center rounded-full hover:bg-butter dark:hover:bg-cocoa-border" aria-label={`Decrease ${it.name}`} onClick={() => setPlanQty(p.storeId, p.itemId, p.planned - 1)}><Minus size={12} /></button>
                      <input type="number" value={p.planned} onChange={(e) => setPlanQty(p.storeId, p.itemId, Number(e.target.value))}
                        className="w-12 bg-transparent text-center text-sm font-semibold tabular focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" aria-label={`Planned ${it.name}`} />
                      <button className="grid h-7 w-7 place-items-center rounded-full hover:bg-butter dark:hover:bg-cocoa-border" aria-label={`Increase ${it.name}`} onClick={() => setPlanQty(p.storeId, p.itemId, p.planned + 1)}><Plus size={12} /></button>
                    </div>
                  </td>
                  <td className={`px-2 py-2 text-right text-xs font-semibold tabular ${Math.abs(delta) < 0.02 ? 'subtle' : ''}`}>{fmtSignedPct(delta, 0)}</td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={() => toggleAccepted(p.storeId, p.itemId, p.planned)} aria-pressed={p.accepted}
                      className={`btn ${p.accepted ? 'bg-sage/40 text-sage-ink dark:bg-sage/25 dark:text-sage' : 'border border-peachBorder bg-white hover:bg-butter dark:border-cocoa-border dark:bg-cocoa'}`}>
                      <AnimatePresence initial={false} mode="wait">
                        <motion.span key={String(p.accepted)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="inline-flex items-center gap-1">
                          {p.accepted ? <><Check size={12} /> Accepted</> : 'Accept'}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ForecastSection() {
  return (
    <section aria-labelledby="forecast">
      <SectionHeader index={2} title="Sales Forecast" description="What the next two weeks look like, why, and what to bake tomorrow." />
      <div className="grid gap-4 lg:grid-cols-3">
        <ForecastChart />
        <DriversPanel />
        <BakePlanTable />
      </div>
    </section>
  );
}
