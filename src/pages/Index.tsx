import { RiskStrip } from '@/components/dashboard/RiskStrip';
import { CommandHeader } from '@/components/dashboard/CommandHeader';
import { MomentumEngine } from '@/components/dashboard/MomentumEngine';
import { CrowdControl } from '@/components/dashboard/CrowdControl';
import { FinancePanel } from '@/components/dashboard/FinancePanel';
import { IncidentFeed } from '@/components/dashboard/IncidentFeed';
import { SimulationToggles } from '@/components/dashboard/SimulationToggles';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Persistent Risk Monitor Strip */}
      <div className="sticky top-0 z-50">
        <RiskStrip />
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Command Header */}
        <CommandHeader />

        {/* 3-Zone Intelligence Grid + Incident Feed */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Main Content */}
          <div className="space-y-4">
            {/* Zone 1 & 2: Momentum + Crowd Control */}
            <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
              <MomentumEngine />
              <CrowdControl />
            </div>

            {/* Zone 3: Finance */}
            <FinancePanel />

            {/* Simulation Toggles */}
            <SimulationToggles />
          </div>

          {/* Incident Feed - Right Column */}
          <div className="hidden lg:block">
            <div className="sticky top-14 h-[calc(100vh-5rem)]">
              <IncidentFeed />
            </div>
          </div>
        </div>

        {/* Mobile Incident Feed */}
        <div className="mt-4 lg:hidden">
          <details className="group">
            <summary className="glass-pill cursor-pointer list-none text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                📋 Incident Feed
                <span className="transition-transform group-open:rotate-180">▾</span>
              </span>
            </summary>
            <div className="mt-2 h-64">
              <IncidentFeed />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default Index;
