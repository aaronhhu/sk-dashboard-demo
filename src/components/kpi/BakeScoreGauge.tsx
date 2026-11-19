import { motion } from 'framer-motion';
import { useFilters } from '../../context/FilterContext';
import { useCountUp } from '../../hooks/useCountUp';
import { useSummary } from '../../hooks/useDashboardData';
import { RANGE_LABELS } from '../../lib/aggregate';
import { Card, Delta } from '../ui/primitives';

const W = 260;
const R = 100;
const CX = W / 2;
const CY = 118;

/** Point on the semicircle; t = 0 at the left end, 1 at the right. */
const at = (t: number, r = R) => [CX - r * Math.cos(Math.PI * t), CY - r * Math.sin(Math.PI * t)];

/** Semicircle gauge drawn like a pie: filling inside, crimped crust bumps along the rim. */
export function BakeScoreGauge() {
  const { score, prevScore } = useSummary();
  const { range } = useFilters();
  const shown = useCountUp(score.score);
  const t = score.score / 100;
  const bumps = 26;
  const label = score.score >= 80 ? 'Golden brown' : score.score >= 65 ? 'Nicely baked' : 'Underproofed';

  const arc = (r: number, t0: number, t1: number) => {
    const [x0, y0] = at(t0, r);
    const [x1, y1] = at(t1, r);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };

  const parts = [
    { label: 'Forecast accuracy', v: score.parts.accuracy, w: '40%' },
    { label: 'Low waste', v: score.parts.waste, w: '35%' },
    { label: 'Sell-through', v: score.parts.sellThrough, w: '25%' },
  ];

  return (
    <Card title="Daily Bake Score" subtitle={`${RANGE_LABELS[range]} · accuracy, waste & sell-through`} skeletonHeight={200} delay={0.1}
      action={<Delta value={(score.score - prevScore.score) / 100} points digits={0} />}>
      <div className="flex flex-col items-center">
        <svg viewBox={`0 0 ${W} 140`} className="w-full max-w-[300px]" role="img" aria-label={`Bake score ${score.score} out of 100`}>
          {/* pie tin */}
          <path d={arc(R - 10, 0, 1)} fill="none" stroke="#FCE3CF" strokeWidth={22} strokeLinecap="round" className="dark:stroke-[#4B372B]" />
          {/* filling */}
          <motion.path d={arc(R - 10, 0, 1)} fill="none" stroke="url(#crust)" strokeWidth={22} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: t }} transition={{ duration: 1.1, ease: 'easeOut' }} />
          {/* crimped crust */}
          {Array.from({ length: bumps + 1 }, (_, i) => {
            const bt = i / bumps;
            const [x, y] = at(bt, R + 6);
            const filled = bt <= t;
            return <circle key={i} cx={x} cy={y} r={5.2} fill={filled ? '#E07A3F' : '#FFE5B4'} opacity={filled ? 0.95 : 0.8} />;
          })}
          {/* lattice hints */}
          {[0.2, 0.4, 0.6, 0.8].map((lt) => {
            const [x0, y0] = at(lt, R - 21);
            const [x1, y1] = at(lt, R + 1);
            return <line key={lt} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#fff" strokeOpacity={0.55} strokeWidth={2} />;
          })}
          <defs>
            <linearGradient id="crust" x1="0" x2="1">
              <stop offset="0%" stopColor="#FFE5B4" />
              <stop offset="55%" stopColor="#FFB677" />
              <stop offset="100%" stopColor="#E07A3F" />
            </linearGradient>
          </defs>
          <text x={CX} y={CY - 18} textAnchor="middle" className="fill-espresso font-display dark:fill-cocoa-text" fontSize={40} fontWeight={600}>{Math.round(shown)}</text>
          <text x={CX} y={CY + 4} textAnchor="middle" className="fill-muted dark:fill-cocoa-muted" fontSize={12}>{label}</text>
        </svg>
        <div className="mt-2 w-full space-y-1.5">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-xs">
              <span className="subtle w-40 shrink-0">{p.label} <span className="opacity-70">({p.w})</span></span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-peachBorder/60 dark:bg-cocoa-border">
                <motion.div className="h-full rounded-full bg-apricot" initial={{ width: 0 }} animate={{ width: `${p.v * 100}%` }} transition={{ duration: 0.8 }} />
              </div>
              <span className="w-8 text-right font-medium tabular">{Math.round(p.v * 100)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
