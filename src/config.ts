import type { Category, Disposition, WasteReason } from './types';

// Rename the bakery here.
export const BAKERY_NAME = 'Golden Hour Bakehouse';

export const OPEN_HOUR = 6;
export const CLOSE_HOUR = 20;

// Chart colors (Morning Bake palette). Categories mix oranges with sage/honey/latte
// so adjacent segments stay distinguishable; every chart also labels values directly.
export const CATEGORY_COLORS: Record<Category, string> = {
  breads: '#E07A3F',
  pastries: '#F4A261',
  cakes: '#F6C667',
  drinks: '#A8C8A0',
  savory: '#B08968',
};
export const CATEGORY_LABELS: Record<Category, string> = {
  breads: 'Breads',
  pastries: 'Pastries',
  cakes: 'Cakes',
  drinks: 'Drinks',
  savory: 'Savory',
};

export const REASON_COLORS: Record<WasteReason, string> = {
  overproduction: '#F4A261',
  expired: '#F6C667',
  damaged: '#B08968',
  quality: '#E3836B',
};
export const REASON_LABELS: Record<WasteReason, string> = {
  overproduction: 'Overproduction',
  expired: 'Expired',
  damaged: 'Damaged',
  quality: 'Quality reject',
};

export const DISPOSITION_COLORS: Record<Disposition, string> = {
  donated: '#A8C8A0',
  bundled: '#F4A261',
  composted: '#B08968',
  binned: '#C9B8AD',
};

export const WASTE_TARGET_RATE = 0.08; // 8% of production
export const SAFETY_BUFFER = 0.06; // bake 6% above forecast demand

export function chartTheme(dark: boolean) {
  return {
    axis: dark ? '#C4AB9A' : '#8A7266',
    grid: dark ? '#4B372B' : '#F6E3D3',
    text: dark ? '#F5E6DA' : '#3D2C24',
    lastWeek: dark ? '#7A6255' : '#D9C4B5',
    band: dark ? 'rgba(244,162,97,0.22)' : 'rgba(255,203,164,0.55)',
  };
}
