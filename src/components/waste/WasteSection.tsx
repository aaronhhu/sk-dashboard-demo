import { motion } from 'framer-motion';
import { HeartHandshake, Leaf, Recycle, Tag, Timer, Trash2, Package } from 'lucide-react';
import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  DISPOSITION_COLORS, REASON_COLORS, REASON_LABELS, WASTE_TARGET_RATE, chartTheme,
} from '../../config';
import { useFilters } from '../../context/FilterContext';
import { useWaste } from '../../hooks/useDashboardData';
import { STORE_BY_ID, fmtHour } from '../../data/mockData';
import { RANGE_LABELS } from '../../lib/aggregate';
import { WEEKDAYS, fmtInt, fmtMoney, fmtPct, mix } from '../../lib/format';
import type { Disposition, WasteReason } from '../../types';
import { Card, EmptyState, SectionHeader, Segmented, TooltipBox } from '../ui/primitives';
import { Legend } from '../sales/SalesSection';

// --------------------------------------------------------------------------- Trend
function WasteTrend() {
  const { dark } = useFilters();
  const { trend } = useWaste();
  const [metric, setMetric] = useState<'value' | 'units'>('value');
  const th = chartTheme(dark);
  const over = trend.filter((t) => t.rate > WASTE_TARGET_RATE).length;
  return (
    <Card className="lg:col-span-2" title="Waste trend" skeletonHeight={260}
      subtitle={`Last 30 closed days · bars = waste ${metric === 'value' ? '$ at cost' : 'units'}, line = waste rate · ${over} days over target`}
      action={<Segmented size="sm" label="Waste metric" value={metric} onChange={setMetric} options={[{ value: 'value', label: '$ value' }, { value: 'units', label: 'Units' }]} />}>
      <div className="h-64">
        <ResponsiveContainer>
          <ComposedChart data={trend} margin={{ top: 10, right: 0, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={th.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: th.axis, fontSize: 10.5 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis yAxisId="l" tick={{ fill: th.axis, fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => (metric === 'value' ? `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}` : String(v))} />
            <YAxis yAxisId="r" orientation="right" tick={{ fill: th.axis, fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, (max: number) => Math.max(0.14, max * 1.1)]} />
            <Tooltip cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,203,164,0.25)' }} content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof trend)[number];
              return <TooltipBox title={label} rows={[
                { label: 'Units', value: fmtInt(p.units), color: '#FFCBA4' },
                { label: 'Value at cost', value: fmtMoney(p.value) },
                { label: 'Waste rate', value: fmtPct(p.rate), color: '#E07A3F' },
              ]} note={p.rate > WASTE_TARGET_RATE ? 'Above the 8% target' : undefined} />;
            }} />
            <Bar yAxisId="l" dataKey={metric} fill="#FFCBA4" radius={[6, 6, 0, 0]} maxBarSize={18} />
            <Line yAxisId="r" dataKey="rate" stroke="#E07A3F" strokeWidth={2.2} dot={false} />
            <ReferenceLine yAxisId="r" y={WASTE_TARGET_RATE} stroke="#B4533C" strokeDasharray="5 4"
              label={{ value: 'Target 8%', fill: dark ? '#E3836B' : '#B4533C', fontSize: 10, position: 'insideTopRight' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ label: metric === 'value' ? 'Waste $ (cost)' : 'Waste units', color: '#FFCBA4' }, { label: 'Waste rate', color: '#E07A3F' }, { label: 'Target', color: '#B4533C', dashed: true }]} />
    </Card>
  );
}

// --------------------------------------------------------------------------- Reasons
function WasteReasons() {
  const { reasons, wasted } = useWaste();
  const { range } = useFilters();
  const rows = (Object.keys(reasons) as WasteReason[]).map((k) => ({ k, v: reasons[k] })).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...rows.map((r) => r.v));
  return (
    <Card title="Waste by reason" subtitle={`${RANGE_LABELS[range]} · ${fmtInt(wasted)} units`} skeletonHeight={260} delay={0.05}>
      {wasted === 0 ? <EmptyState icon={<Recycle size={20} />} title="No waste logged" body="Nothing has been written off in this period yet." /> : (
        <ul className="space-y-4 pt-2">
          {rows.map((r, i) => (
            <li key={r.k}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium">{REASON_LABELS[r.k]}</span>
                <span className="tabular"><b>{fmtInt(r.v)}</b> <span className="subtle text-xs">· {fmtPct(r.v / wasted, 0)}</span></span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-cream dark:bg-cocoa/60">
                <motion.div className="h-full rounded-full" style={{ background: REASON_COLORS[r.k] }}
                  initial={{ width: 0 }} animate={{ width: `${(r.v / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.06 }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// --------------------------------------------------------------------------- Heatmap
function WasteHeatmap() {
  const { heatmap } = useWaste();
  const { dark } = useFilters();
  const max = Math.max(...heatmap.rows.flatMap((r) => r.values));
  let peak = { item: '', dow: -1, v: 0 };
  heatmap.rows.forEach((r) => r.values.forEach((v, i) => { if (v > peak.v) peak = { item: r.item.id, dow: i, v }; }));
  const low = dark ? '#3A2B22' : '#FFF4E6';
  const high = '#E07A3F';
  const peakRow = heatmap.rows.find((r) => r.item.id === peak.item);

  return (
    <Card className="lg:col-span-2" title="Waste heatmap" skeletonHeight={280}
      subtitle={`Avg units wasted per day · item × weekday · last 12 weeks${peakRow ? ` · hotspot: ${peakRow.item.name}, ${WEEKDAYS[heatmap.dows[peak.dow]]}` : ''}`}>
      <div className="overflow-x-auto">
        <div className="grid min-w-[520px] gap-1" style={{ gridTemplateColumns: '150px repeat(7, minmax(44px, 1fr))' }}>
          <div />
          {heatmap.dows.map((d) => <div key={d} className="subtle pb-1 text-center text-[11px] font-semibold">{WEEKDAYS[d]}</div>)}
          {heatmap.rows.map((r) => (
            <div key={r.item.id} className="contents">
              <div className="truncate pr-2 text-[13px] leading-8">{r.item.name}</div>
              {r.values.map((v, i) => {
                const t = max ? v / max : 0;
                const isPeak = r.item.id === peak.item && i === peak.dow;
                return (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                    title={`${r.item.name} · ${WEEKDAYS[heatmap.dows[i]]}: ${v.toFixed(1)} units/day`}
                    className={`grid h-8 place-items-center rounded-lg text-[11px] font-semibold tabular ${isPeak ? 'ring-2 ring-espresso dark:ring-cocoa-text' : ''}`}
                    style={{ background: mix(low, high, Math.pow(t, 0.85)), color: t > 0.55 ? '#fff' : dark ? '#F5E6DA' : '#3D2C24' }}>
                    {v.toFixed(1)}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] subtle">
        <span>Less</span>
        <div className="h-2 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${low}, ${high})` }} />
        <span>More</span>
        <span className="ml-3">Outlined cell = biggest hotspot</span>
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- Rescue ledger
const DISP: { k: Disposition; label: string; icon: typeof Leaf }[] = [
  { k: 'donated', label: 'Donated to food banks', icon: HeartHandshake },
  { k: 'bundled', label: 'End-of-day bundles', icon: Package },
  { k: 'composted', label: 'Composted', icon: Recycle },
  { k: 'binned', label: 'Binned', icon: Trash2 },
];

function RescueLedger() {
  const { rescue, quarter } = useWaste();
  const { range } = useFilters();
  const total = Object.values(rescue.dispositions).reduce((a, b) => a + b, 0);
  return (
    <Card title="Rescue Ledger" subtitle={`Where unsold food went · ${RANGE_LABELS[range]}`} skeletonHeight={280} delay={0.05}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-sage/25 p-2 dark:bg-sage/15">
          <div className="font-display text-xl font-semibold tabular">{fmtInt(rescue.meals)}</div>
          <div className="subtle text-[11px]">meals donated</div>
        </div>
        <div className="rounded-xl bg-butter/70 p-2 dark:bg-honey/15">
          <div className="font-display text-xl font-semibold tabular">{fmtInt(rescue.co2)}</div>
          <div className="subtle text-[11px]">kg CO₂e avoided</div>
        </div>
        <div className="rounded-xl bg-peach/40 p-2 dark:bg-apricot/15">
          <div className="font-display text-xl font-semibold tabular">{fmtPct(rescue.rescued, 0)}</div>
          <div className="subtle text-[11px]">rescued</div>
        </div>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label="Disposition split">
        {DISP.map((d) => (
          <motion.div key={d.k} style={{ background: DISPOSITION_COLORS[d.k] }} initial={{ width: 0 }}
            animate={{ width: total ? `${(rescue.dispositions[d.k] / total) * 100}%` : 0 }} transition={{ duration: 0.8 }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {DISP.map((d) => (
          <li key={d.k} className="flex items-center gap-2 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: DISPOSITION_COLORS[d.k] + '66' }}><d.icon size={13} /></span>
            <span className="flex-1">{d.label}</span>
            <span className="font-medium tabular">{fmtInt(rescue.dispositions[d.k])}</span>
            <span className="subtle w-9 text-right text-xs tabular">{total ? fmtPct(rescue.dispositions[d.k] / total, 0) : '—'}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl border border-dashed border-peach p-2 text-[11px] subtle dark:border-cocoa-border">
        <b className="text-espresso dark:text-cocoa-text">Quarter to date:</b> {fmtInt(quarter.meals)} meals donated · {fmtInt(quarter.co2)} kg CO₂e avoided
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- Freshness strip
function FreshnessStrip() {
  const { shelf, shelfStore } = useWaste();
  const { store } = useFilters();
  const fmtLeft = (h: number) => {
    if (h <= 0.01) return 'Mark down now';
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `Markdown in ${hh ? `${hh}h ` : ''}${mm}m`;
  };
  return (
    <Card className="lg:col-span-3" title={<span className="inline-flex items-center gap-2"><Timer size={17} className="text-burntSugar" /> On the shelf now · {STORE_BY_ID[shelfStore].name}</span>}
      subtitle={`Time from latest batch to markdown, live${store === 'all' ? ' · pick a store in the top bar to switch' : ''}`} skeletonHeight={110}>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {shelf.map((s) => {
          const color = s.progress < 0.6 ? mix('#FFCBA4', '#F6C667', s.progress / 0.6) : mix('#F6C667', '#E3836B', (s.progress - 0.6) / 0.4);
          const urgent = s.markdownInHrs < 0.75;
          return (
            <div key={s.item.id} className={`w-48 shrink-0 snap-start rounded-xl border p-3 ${urgent ? 'border-terracotta/70 bg-terracotta/10' : 'border-peachBorder bg-cream/60 dark:border-cocoa-border dark:bg-cocoa/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold leading-tight">{s.item.name}</div>
                <span className="chip bg-white tabular dark:bg-cocoa-card">{s.onShelf}</span>
              </div>
              <div className="subtle mt-0.5 text-[11px]">Baked {fmtHour(Math.round(s.bakedAt * 4) / 4)}</div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white dark:bg-cocoa-card">
                <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${s.progress * 100}%` }} transition={{ duration: 0.8 }} />
              </div>
              <div className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${urgent ? 'text-terracotta-ink dark:text-terracotta' : 'subtle'}`}>
                {urgent && <Tag size={11} />}
                {fmtLeft(s.markdownInHrs)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function WasteSection() {
  return (
    <section aria-labelledby="waste">
      <SectionHeader index={3} title="Waste Management" description="How much is left over, why, when it happens, and where it goes." />
      <div className="grid gap-4 lg:grid-cols-3">
        <WasteTrend />
        <WasteReasons />
        <WasteHeatmap />
        <RescueLedger />
        <FreshnessStrip />
      </div>
    </section>
  );
}
