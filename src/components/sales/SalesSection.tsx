import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus, Store as StoreIcon } from 'lucide-react';
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { CATEGORY_COLORS, CATEGORY_LABELS, chartTheme } from '../../config';
import { useFilters } from '../../context/FilterContext';
import { useSales } from '../../hooks/useDashboardData';
import { fmtHour } from '../../data/mockData';
import { RANGE_LABELS } from '../../lib/aggregate';
import { WEEKDAYS_LONG, fmtMoney, fmtPct } from '../../lib/format';
import type { Category } from '../../types';
import { Card, Delta, EmptyState, PulseDot, SectionHeader, TooltipBox } from '../ui/primitives';

// --------------------------------------------------------------------------- Hourly curve
function HourlyChart() {
  const { dark, nowHour, now } = useFilters();
  const { hourly } = useSales();
  const th = chartTheme(dark);
  const lastWeekDay = WEEKDAYS_LONG[now.getDay()];
  const anomalyRow = hourly.anomaly && hourly.rows.find((r) => r.hour === hourly.anomaly!.hour);
  const beforeOpen = nowHour < 6;

  return (
    <Card className="lg:col-span-2" title="Hourly sales" skeletonHeight={240}
      subtitle={`Today vs last ${lastWeekDay} · solid = actual, dotted = projected to close`}>
      {beforeOpen && <p className="subtle mb-2 text-xs">Stores open at 6 AM. Showing today's projection.</p>}
      <div className="h-64">
        <ResponsiveContainer>
          <ComposedChart data={hourly.rows} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="todayFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F4A261" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#F4A261" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={th.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: th.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={{ fill: th.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip cursor={{ stroke: th.axis, strokeDasharray: 3 }} content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as (typeof hourly.rows)[number];
              return (
                <TooltipBox title={label} rows={[
                  ...(row.today != null ? [{ label: 'Today', value: fmtMoney(row.today), color: '#E07A3F' }] : []),
                  ...(row.today == null && row.projected != null ? [{ label: 'Projected', value: fmtMoney(row.projected), color: '#E07A3F', dashed: true }] : []),
                  { label: `Last ${lastWeekDay}`, value: fmtMoney(row.lastWeek), color: th.lastWeek, dashed: true },
                ]} note={row.anomaly && hourly.anomaly ? <><b>⚡ {hourly.anomaly.label}.</b> {hourly.anomaly.detail}</> : undefined} />
              );
            }} />
            <Line type="monotone" dataKey="lastWeek" stroke={th.lastWeek} strokeWidth={2} strokeDasharray="5 4" dot={false} name="Last week" />
            <Area type="monotone" dataKey="today" stroke="#E07A3F" strokeWidth={2.5} fill="url(#todayFill)" connectNulls={false} name="Today" />
            <Line type="monotone" dataKey="projected" stroke="#E07A3F" strokeWidth={2.5} strokeDasharray="1 5" strokeLinecap="round" dot={false} name="Projected" />
            {!beforeOpen && nowHour < 20 && <ReferenceLine x={fmtHour(Math.floor(nowHour))} stroke={th.axis} strokeDasharray="2 2" label={{ value: 'now', fill: th.axis, fontSize: 10, position: 'top' }} />}
            {anomalyRow && anomalyRow.today != null && (
              <ReferenceDot x={anomalyRow.label} y={anomalyRow.today} shape={(p: object) => <PulseDot {...p} />} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[
        { label: 'Today (actual)', color: '#E07A3F' },
        { label: 'Today (projected, dotted)', color: '#E07A3F', dashed: true },
        { label: `Last ${lastWeekDay}`, color: th.lastWeek, dashed: true },
        ...(hourly.anomaly ? [{ label: 'Anomaly (hover)', color: '#E07A3F', dot: true }] : []),
      ]} />
    </Card>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean; dot?: boolean }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] subtle">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dot
            ? <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: i.color }} />
            : <span className="inline-block h-0 w-4" style={{ borderTop: `2.5px ${i.dashed ? 'dashed' : 'solid'} ${i.color}` }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------- Category treemap
function TreeCell(props: { x?: number; y?: number; width?: number; height?: number; name?: string; value?: number; fill?: string; share?: number; depth?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, name, value = 0, fill, share = 0, depth } = props;
  if (depth === 0 || width < 2 || height < 2) return null; // depth 0 is the root container
  return (
    <g>
      <rect x={x + 2} y={y + 2} width={width - 4} height={height - 4} rx={12} fill={fill} />
      {width > 60 && height > 38 && (
        <>
          <text x={x + 12} y={y + 22} fill="#3D2C24" fontSize={12} fontWeight={600}>{name}</text>
          <text x={x + 12} y={y + 38} fill="#3D2C24" fontSize={11} opacity={0.8}>{fmtMoney(value, true)} · {fmtPct(share, 0)}</text>
        </>
      )}
    </g>
  );
}

function CategoryMix() {
  const { byCategory } = useSales();
  const { range } = useFilters();
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const data = (Object.keys(byCategory) as Category[])
    .map((c) => ({ name: CATEGORY_LABELS[c], size: byCategory[c], fill: CATEGORY_COLORS[c], share: total ? byCategory[c] / total : 0 }))
    .sort((a, b) => b.size - a.size);
  return (
    <Card title="Sales by category" subtitle={RANGE_LABELS[range]} skeletonHeight={240} delay={0.05}>
      {total === 0 ? <EmptyState icon={<StoreIcon size={20} />} title="No sales yet" body="Doors open at 6 AM. Check back after the first rush." /> : (
        <div className="h-64">
          <ResponsiveContainer>
            <Treemap data={data} dataKey="size" isAnimationActive={false} content={<TreeCell />}>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return <TooltipBox title={p.name} rows={[{ label: 'Revenue', value: fmtMoney(p.size) }, { label: 'Share', value: fmtPct(p.share) }]} />;
              }} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// --------------------------------------------------------------------------- Leaderboard
function Leaderboard() {
  const { leaderboard } = useSales();
  const { store, setStore, range } = useFilters();
  const max = Math.max(...leaderboard.map((l) => l.revenue));
  return (
    <Card className="lg:col-span-2" title="Store leaderboard" skeletonHeight={250} delay={0.05}
      subtitle={`${RANGE_LABELS[range]} · click a store to filter the whole dashboard`}
      action={store !== 'all' && <button className="btn bg-butter text-espresso hover:bg-peach" onClick={() => setStore('all')}>Show all stores</button>}>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="subtle text-left text-[11px] uppercase tracking-wide">
              <th className="px-2 py-1.5 font-medium">#</th>
              <th className="px-2 py-1.5 font-medium">Store</th>
              <th className="px-2 py-1.5 font-medium">Sales</th>
              <th className="px-2 py-1.5 font-medium">Growth</th>
              <th className="px-2 py-1.5 text-right font-medium">Avg ticket</th>
              <th className="px-2 py-1.5 font-medium">Top baked good</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((l, i) => {
              const selected = store === l.store.id;
              return (
                <tr key={l.store.id} tabIndex={0} aria-selected={selected}
                  onClick={() => setStore(selected ? 'all' : l.store.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setStore(selected ? 'all' : l.store.id))}
                  className={`cursor-pointer border-t border-peachBorder/70 transition hover:bg-cream focus:outline-none focus-visible:bg-butter/50 dark:border-cocoa-border dark:hover:bg-cocoa/50 ${selected ? 'bg-butter/60 dark:bg-cocoa-border/60' : ''} ${store !== 'all' && !selected ? 'opacity-55' : ''}`}>
                  <td className="px-2 py-2.5 font-display font-semibold text-burntSugar">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <div className="font-semibold">{l.store.name}</div>
                    <div className="subtle text-[11px]">{l.store.short}</div>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-medium tabular">{fmtMoney(l.revenue, true)}</span>
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-peachBorder/60 dark:bg-cocoa-border">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-peach to-burntSugar" initial={{ width: 0 }} animate={{ width: `${(l.revenue / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.04 }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5"><Delta value={l.growth} /></td>
                  <td className="px-2 py-2.5 text-right tabular">{fmtMoney(l.avgTicket)}</td>
                  <td className="px-2 py-2.5 text-[13px]">{l.topSeller}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- Top items
function TopItems() {
  const { topItems } = useSales();
  const { range } = useFilters();
  return (
    <Card title="Top 10 items" subtitle={`${RANGE_LABELS[range]} · rank change vs previous period`} skeletonHeight={250} delay={0.1}>
      <ol className="space-y-1">
        {topItems.map((t) => (
          <li key={t.item.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-cream dark:hover:bg-cocoa/50">
            <span className="w-5 text-right font-display font-semibold text-burntSugar tabular">{t.rank}</span>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[t.item.category] }} title={CATEGORY_LABELS[t.item.category]} />
            <span className="flex-1 truncate">{t.item.name}</span>
            <span className="tabular subtle text-xs">{fmtMoney(t.revenue, true)}</span>
            <span className={`flex w-9 items-center justify-end gap-0.5 text-[11px] font-semibold tabular ${t.change > 0 ? 'text-sage-ink dark:text-sage' : t.change < 0 ? 'text-terracotta-ink dark:text-terracotta' : 'subtle'}`}
              aria-label={t.change === 0 ? 'no rank change' : `${t.change > 0 ? 'up' : 'down'} ${Math.abs(t.change)}`}>
              {t.change > 0 ? <ArrowUp size={12} /> : t.change < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
              {t.change !== 0 && Math.abs(t.change)}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function SalesSection() {
  return (
    <section aria-labelledby="sales">
      <SectionHeader index={1} title="Store Sales" description="How today and the selected period are tracking, by hour, category, store and item." />
      <div className="grid gap-4 lg:grid-cols-3">
        <HourlyChart />
        <CategoryMix />
        <Leaderboard />
        <TopItems />
      </div>
    </section>
  );
}
