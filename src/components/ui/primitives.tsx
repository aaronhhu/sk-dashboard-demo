import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFilters } from '../../context/FilterContext';
import { fmtSignedPct } from '../../lib/format';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Height of the loading skeleton body. */
  skeletonHeight?: number;
  delay?: number;
  id?: string;
}

/** Rounded peach-bordered card that rises in on mount and shows a skeleton while loading. */
export function Card({ title, subtitle, action, children, className = '', skeletonHeight = 160, delay = 0, id }: CardProps) {
  const { loading } = useFilters();
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`card p-4 sm:p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="subtle mt-0.5 text-xs">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {loading ? <Skeleton height={skeletonHeight} /> : children}
    </motion.section>
  );
}

export function Skeleton({ height = 120, className = '' }: { height?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true" aria-label="Loading">
      <div className="skeleton rounded-xl" style={{ height: height * 0.7 }} />
      <div className="flex gap-2">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-3 w-1/4 rounded-full" />
      </div>
    </div>
  );
}

/** Change indicator with arrow + sign so meaning never depends on color alone. */
export function Delta({ value, goodWhenUp = true, points, digits = 1 }: { value: number; goodWhenUp?: boolean; points?: boolean; digits?: number }) {
  const flat = Math.abs(value) < 0.0005;
  const good = flat ? null : (value > 0) === goodWhenUp;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = good === null
    ? 'bg-peachBorder/60 text-muted dark:bg-cocoa-border dark:text-cocoa-muted'
    : good
      ? 'bg-sage/30 text-sage-ink dark:bg-sage/20 dark:text-sage'
      : 'bg-terracotta/20 text-terracotta-ink dark:bg-terracotta/25 dark:text-terracotta';
  return (
    <span className={`chip tabular ${tone}`}>
      <Icon size={12} strokeWidth={2.5} aria-hidden />
      {points
        ? `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(digits)} pts`
        : flat ? '0.0%' : fmtSignedPct(value, digits)}
    </span>
  );
}

export function SectionHeader({ index, title, description, children }: { index: number; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-3 mt-10 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-apricot font-display text-lg font-bold text-white shadow-soft">{index}</span>
        <div>
          <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
          <p className="subtle text-sm">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Pulsing marker for anomalies, used as a Recharts ReferenceDot shape. */
export function PulseDot(props: { cx?: number; cy?: number; color?: string }) {
  const { cx = 0, cy = 0, color = '#E07A3F' } = props;
  return (
    <g style={{ cursor: 'help' }}>
      <circle cx={cx} cy={cy} r={6} fill={color} className="pulse-ring" />
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
    </g>
  );
}

/** Shared tooltip chrome for Recharts. */
export function TooltipBox({ title, rows, note }: { title: ReactNode; rows: { label: string; value: string; color?: string; dashed?: boolean }[]; note?: ReactNode }) {
  return (
    <div className="max-w-[260px] rounded-xl border border-peachBorder bg-white/95 px-3 py-2 text-xs shadow-soft backdrop-blur dark:border-cocoa-border dark:bg-cocoa-card/95">
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 tabular">
          <span className="flex items-center gap-1.5 subtle">
            {r.color && <span className="inline-block h-2 w-3 rounded-sm" style={{ background: r.dashed ? 'transparent' : r.color, border: r.dashed ? `1.5px dashed ${r.color}` : undefined }} />}
            {r.label}
          </span>
          <span className="font-medium">{r.value}</span>
        </div>
      ))}
      {note && <div className="mt-1.5 border-t border-peachBorder pt-1.5 text-[11px] leading-snug dark:border-cocoa-border">{note}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md', label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md'; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-peachBorder bg-cream/70 p-0.5 dark:border-cocoa-border dark:bg-cocoa/60">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-full font-semibold transition ${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} ${active ? 'text-white' : 'text-muted hover:text-espresso dark:text-cocoa-muted dark:hover:text-cocoa-text'}`}
          >
            {active && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-full bg-burntSugar" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-peach bg-cream/60 px-4 py-8 text-center dark:border-cocoa-border dark:bg-cocoa/40">
      <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-butter text-burntSugar dark:bg-cocoa-border">{icon}</div>
      <div className="font-display font-semibold">{title}</div>
      <p className="subtle mt-1 max-w-xs text-xs">{body}</p>
    </div>
  );
}
