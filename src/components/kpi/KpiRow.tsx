import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { useFilters } from '../../context/FilterContext';
import { useSparklines, useSummary } from '../../hooks/useDashboardData';
import { useCountUp } from '../../hooks/useCountUp';
import { fmtInt, fmtMoney, fmtPct } from '../../lib/format';
import { Card, Delta } from '../ui/primitives';
import { WASTE_TARGET_RATE } from '../../config';

function Sparkline({ data, k, color }: { data: Record<string, number>[]; k: string; color: string }) {
  const id = `sp-${k}`;
  return (
    <div className="h-10 w-full" aria-hidden>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area type="monotone" dataKey={k} stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ label, value, format, delta, goodWhenUp = true, sub, spark, sparkKey, color, delay, deltaIsPoints }: {
  label: string; value: number; format: (v: number) => string; delta: number; goodWhenUp?: boolean; sub?: string;
  spark: Record<string, number>[]; sparkKey: string; color: string; delay: number; deltaIsPoints?: boolean;
}) {
  const { range } = useFilters();
  const animated = useCountUp(value);
  const vs = range === 'today' ? 'vs last wk' : 'vs prev';
  return (
    <Card delay={delay} skeletonHeight={86} className="!p-4">
      <div className="subtle text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className="mt-1 font-display text-[28px] font-semibold leading-none tabular">{format(animated)}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Delta value={delta} goodWhenUp={goodWhenUp} points={deltaIsPoints} />
        <span className="subtle text-[11px]">{vs}</span>
      </div>
      {sub && <div className="subtle mt-1 truncate text-[11px] tabular">{sub}</div>}
      <div className="mt-2">
        <Sparkline data={spark} k={sparkKey} color={color} />
        <div className="subtle -mt-0.5 text-[10px]">14 closed days</div>
      </div>
    </Card>
  );
}

export function KpiRow() {
  const { cur, prev } = useSummary();
  const spark = useSparklines() as unknown as Record<string, number>[];
  const { range } = useFilters();
  const projected = range === 'today' ? ' (proj.)' : '';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Kpi delay={0} label={range === 'today' ? 'Net sales today' : 'Net sales'} value={cur.revenue} format={(v) => fmtMoney(v, true)}
        delta={prev.revenue ? cur.revenue / prev.revenue - 1 : 0} spark={spark} sparkKey="revenue" color="#E07A3F"
        sub={range === 'today' ? 'As of now, all channels' : undefined} />
      <Kpi delay={0.05} label="Transactions" value={cur.transactions} format={fmtInt}
        delta={prev.transactions ? cur.transactions / prev.transactions - 1 : 0} spark={spark} sparkKey="transactions" color="#F4A261"
        sub={`Avg ticket ${fmtMoney(cur.avgTicket)} (${prev.avgTicket ? ((cur.avgTicket / prev.avgTicket - 1) * 100).toFixed(1) : '0.0'}%)`} />
      <Kpi delay={0.1} label="Forecast accuracy" value={1 - cur.mape} format={(v) => fmtPct(v)}
        delta={(prev.mape - cur.mape)} deltaIsPoints spark={spark} sparkKey="mape" color="#B08968"
        sub={`MAPE ${fmtPct(cur.mape)} · store-day revenue`} />
      <Kpi delay={0.15} label={`Waste rate${projected}`} value={cur.wasteRate} format={(v) => fmtPct(v)}
        delta={cur.wasteRate - prev.wasteRate} goodWhenUp={false} deltaIsPoints spark={spark} sparkKey="wasteRate" color="#E3836B"
        sub={`${fmtInt(cur.wasted)} units · target ≤ ${fmtPct(WASTE_TARGET_RATE, 0)}`} />
      <Kpi delay={0.2} label={`Sell-through${projected}`} value={cur.sellThrough} format={(v) => fmtPct(v)}
        delta={cur.sellThrough - prev.sellThrough} deltaIsPoints spark={spark} sparkKey="sellThrough" color="#A8C8A0"
        sub={`By close · ${fmtInt(cur.sold)} of ${fmtInt(cur.baked)} baked sold`} />
    </div>
  );
}
