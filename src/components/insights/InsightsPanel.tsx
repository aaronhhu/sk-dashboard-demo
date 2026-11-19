import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, ChevronDown, Croissant, Lightbulb, PackageX, Recycle, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useFilters } from '../../context/FilterContext';
import { useInsights } from '../../hooks/useDashboardData';
import type { Insight } from '../../types';
import { Card, EmptyState } from '../ui/primitives';

const TONE: Record<Insight['tone'], { icon: typeof Lightbulb; bg: string; label: string }> = {
  waste: { icon: Recycle, bg: 'bg-terracotta/15 text-terracotta-ink dark:text-terracotta', label: 'Waste' },
  stockout: { icon: PackageX, bg: 'bg-honey/30 text-honey-ink dark:text-honey', label: 'Stockout' },
  ops: { icon: Lightbulb, bg: 'bg-peach/50 text-burntSugar', label: 'Ops' },
  opportunity: { icon: TrendingUp, bg: 'bg-sage/30 text-sage-ink dark:text-sage', label: 'Demand' },
};

function InsightCard({ ins, i }: { ins: Insight; i: number }) {
  const { applyInsight, appliedInsights } = useFilters();
  const [open, setOpen] = useState(false);
  const applied = appliedInsights.includes(ins.id);
  const tone = TONE[ins.tone];
  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
      className={`flex flex-col rounded-xl border p-3 ${applied ? 'border-sage/60 bg-sage/10' : 'border-peachBorder bg-cream/50 dark:border-cocoa-border dark:bg-cocoa/40'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tone.bg}`} title={tone.label}><tone.icon size={16} /></span>
        <div className="min-w-0">
          <h4 className="text-[13.5px] font-semibold leading-snug">{ins.title}</h4>
          <p className="subtle mt-0.5 text-xs leading-relaxed">{ins.body}</p>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="ml-10 mt-2 list-disc space-y-1 overflow-hidden pl-4 text-xs leading-relaxed marker:text-apricot">
            {ins.why.map((w) => <li key={w}>{w}</li>)}
          </motion.ul>
        )}
      </AnimatePresence>
      <div className="ml-10 mt-auto flex items-center gap-2 pt-2.5">
        <button className="btn subtle hover:bg-peachBorder/50 dark:hover:bg-cocoa-border" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Why? <ChevronDown size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        <button disabled={applied} onClick={() => applyInsight(ins)}
          className={`btn ${applied ? 'bg-sage/40 text-sage-ink dark:text-sage' : 'bg-burntSugar text-white hover:bg-[#c96a33]'}`}>
          {applied ? <><Check size={12} /> Applied to plan</> : ins.actionLabel}
        </button>
      </div>
    </motion.article>
  );
}

export function InsightsPanel() {
  const insights = useInsights();
  const { appliedInsights } = useFilters();
  const pending = insights.filter((i) => !appliedInsights.includes(i.id));
  return (
    <Card className="lg:col-span-2" skeletonHeight={200} delay={0.15}
      title={<span className="inline-flex items-center gap-2"><Bot size={18} className="text-burntSugar" /> Ops Assistant</span>}
      subtitle="Patterns spotted in the last 4 weeks, with one-click fixes for tomorrow's bake plan"
      action={<span className="chip bg-butter text-espresso tabular">{pending.length} open</span>}>
      {insights.length === 0 ? (
        <EmptyState icon={<Croissant size={20} />} title="All caught up" body="No unusual patterns today. Fresh insights arrive after tonight's close." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((ins, i) => <InsightCard key={ins.id} ins={ins} i={i} />)}
        </div>
      )}
      {insights.length > 0 && pending.length === 0 && (
        <p className="mt-3 text-center text-xs font-semibold text-sage-ink dark:text-sage">All suggestions applied. Tomorrow's plan is ready to send to the bake team.</p>
      )}
    </Card>
  );
}
