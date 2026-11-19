import { BAKERY_NAME } from './config';
import { FilterProvider, useFilters } from './context/FilterContext';
import { TopBar } from './components/TopBar';
import { KpiRow } from './components/kpi/KpiRow';
import { BakeScoreGauge } from './components/kpi/BakeScoreGauge';
import { InsightsPanel } from './components/insights/InsightsPanel';
import { SalesSection } from './components/sales/SalesSection';
import { ForecastSection } from './components/forecast/ForecastSection';
import { WasteSection } from './components/waste/WasteSection';
import { STORE_BY_ID } from './data/mockData';

function Greeting() {
  const { now, store } = useFilters();
  const h = now.getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="mb-4 mt-6">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">{part} ☕</h1>
      <p className="subtle text-sm">
        Here's how {store === 'all' ? 'all six stores are' : `${STORE_BY_ID[store].name} is`} baking today.
      </p>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
        <Greeting />
        <KpiRow />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <BakeScoreGauge />
          <InsightsPanel />
        </div>
        <SalesSection />
        <ForecastSection />
        <WasteSection />
        <footer className="subtle mt-12 text-center text-xs">
          {BAKERY_NAME} · demo with seeded mock data · today's waste and sell-through are projected to close
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FilterProvider>
      <Dashboard />
    </FilterProvider>
  );
}
