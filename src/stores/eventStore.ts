import { create } from 'zustand';

export interface RiskAlert {
  id: string;
  message: string;
  level: 'normal' | 'warning' | 'critical';
  icon: string;
}

export interface IncidentItem {
  id: string;
  message: string;
  level: 'success' | 'warning' | 'info';
  time: string;
}

export interface PayoutLog {
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed';
}

export interface ChannelROI {
  name: string;
  revenue: number;
  conversion: number;
}

export interface EventData {
  id: string;
  name: string;
  shortName: string;
  isLive: boolean;
  totalRevenue: number;
  projectedRevenue: number;
  breakEvenTarget: number;
  ticketsSold: number;
  totalTickets: number;
  ticketsRemaining: number;
  entryCount: number;
  totalCapacity: number;
  entryRate: number;
  timeToCapacity: number;
  walletMZN: number;
  walletUSD: number;
  walletEUR: number;
  settlementUSD: string;
  settlementEUR: string;
  availableFunds: number;
  lockedFunds: number;
  upcomingSettlement: number;
  velocityData: { time: string; actual: number | null; projected: number }[];
  riskAlerts: RiskAlert[];
  incidents: IncidentItem[];
  payoutLogs: PayoutLog[];
  channelROI: ChannelROI[];
}

interface SimulationState {
  refundSpike: boolean;
  gateSlowdown: boolean;
  apiLatency: boolean;
  highEntryRate: boolean;
}

interface EventStore {
  currentEventId: string;
  events: EventData[];
  simulation: SimulationState;
  setCurrentEvent: (id: string) => void;
  toggleSimulation: (key: keyof SimulationState) => void;
}

const mockEvents: EventData[] = [
  {
    id: 'ttv',
    name: 'TTV: The Terminal Vibes',
    shortName: 'TTV',
    isLive: true,
    totalRevenue: 1_240_000,
    projectedRevenue: 1_850_000,
    breakEvenTarget: 1_000_000,
    ticketsSold: 2_340,
    totalTickets: 2_800,
    ticketsRemaining: 460,
    entryCount: 1_876,
    totalCapacity: 2_800,
    entryRate: 42,
    timeToCapacity: 38,
    walletMZN: 980_000,
    walletUSD: 4_200,
    walletEUR: 2_100,
    settlementUSD: '2 days',
    settlementEUR: '3 days',
    availableFunds: 620_000,
    lockedFunds: 310_000,
    upcomingSettlement: 310_000,
    velocityData: [
      { time: '18:00', actual: 0, projected: 0 },
      { time: '19:00', actual: 120_000, projected: 130_000 },
      { time: '20:00', actual: 380_000, projected: 400_000 },
      { time: '21:00', actual: 680_000, projected: 720_000 },
      { time: '22:00', actual: 920_000, projected: 1_000_000 },
      { time: '23:00', actual: 1_100_000, projected: 1_300_000 },
      { time: '00:00', actual: 1_240_000, projected: 1_550_000 },
      { time: '01:00', actual: null, projected: 1_700_000 },
      { time: '02:00', actual: null, projected: 1_850_000 },
    ],
    riskAlerts: [
      { id: '1', message: 'All Systems Operational', level: 'normal', icon: '✓' },
      { id: '2', message: 'Payout Completed', level: 'normal', icon: '✓' },
    ],
    incidents: [
      { id: '1', message: 'Gate 2 synced', level: 'success', time: '22:41' },
      { id: '2', message: 'Scanner battery low (Gate 4)', level: 'warning', time: '22:38' },
      { id: '3', message: '500 tickets scanned milestone', level: 'success', time: '22:30' },
      { id: '4', message: '12 duplicate QR attempts blocked', level: 'warning', time: '22:22' },
      { id: '5', message: '1000 tickets scanned milestone', level: 'success', time: '22:15' },
      { id: '6', message: 'Gate 1 synced', level: 'success', time: '22:10' },
      { id: '7', message: 'VIP entry lane activated', level: 'info', time: '22:05' },
      { id: '8', message: 'Payment gateway healthy', level: 'success', time: '22:00' },
    ],
    payoutLogs: [
      { amount: 320_000, currency: 'MZN', status: 'success' },
      { amount: 150_000, currency: 'MZN', status: 'pending' },
      { amount: 50_000, currency: 'MZN', status: 'failed' },
    ],
    channelROI: [
      { name: 'WhatsApp', revenue: 520_000, conversion: 12.4 },
      { name: 'In-App Feed', revenue: 380_000, conversion: 8.7 },
      { name: 'Instagram', revenue: 240_000, conversion: 5.2 },
      { name: 'Direct Link', revenue: 100_000, conversion: 22.1 },
    ],
  },
  {
    id: 'afrowave',
    name: 'AfroWave Festival',
    shortName: 'AWF',
    isLive: false,
    totalRevenue: 3_450_000,
    projectedRevenue: 3_800_000,
    breakEvenTarget: 2_500_000,
    ticketsSold: 5_200,
    totalTickets: 6_000,
    ticketsRemaining: 800,
    entryCount: 0,
    totalCapacity: 6_000,
    entryRate: 0,
    timeToCapacity: 0,
    walletMZN: 2_100_000,
    walletUSD: 12_400,
    walletEUR: 5_800,
    settlementUSD: '1 day',
    settlementEUR: '2 days',
    availableFunds: 1_725_000,
    lockedFunds: 862_500,
    upcomingSettlement: 862_500,
    velocityData: [
      { time: 'Mon', actual: 450_000, projected: 500_000 },
      { time: 'Tue', actual: 980_000, projected: 1_000_000 },
      { time: 'Wed', actual: 1_600_000, projected: 1_700_000 },
      { time: 'Thu', actual: 2_200_000, projected: 2_400_000 },
      { time: 'Fri', actual: 2_900_000, projected: 3_100_000 },
      { time: 'Sat', actual: 3_450_000, projected: 3_500_000 },
      { time: 'Sun', actual: null, projected: 3_800_000 },
    ],
    riskAlerts: [
      { id: '1', message: 'All Systems Operational', level: 'normal', icon: '✓' },
    ],
    incidents: [
      { id: '1', message: 'Ticket sales milestone: 5000', level: 'success', time: '14:20' },
      { id: '2', message: 'Payment reconciliation complete', level: 'success', time: '13:45' },
    ],
    payoutLogs: [
      { amount: 1_200_000, currency: 'MZN', status: 'success' },
      { amount: 500_000, currency: 'MZN', status: 'success' },
    ],
    channelROI: [
      { name: 'WhatsApp', revenue: 1_200_000, conversion: 15.2 },
      { name: 'In-App Feed', revenue: 900_000, conversion: 10.1 },
      { name: 'Instagram', revenue: 850_000, conversion: 7.8 },
      { name: 'Direct Link', revenue: 500_000, conversion: 25.3 },
    ],
  },
  {
    id: 'maputo-tech',
    name: 'Maputo Tech Night',
    shortName: 'MTN',
    isLive: false,
    totalRevenue: 180_000,
    projectedRevenue: 250_000,
    breakEvenTarget: 150_000,
    ticketsSold: 320,
    totalTickets: 500,
    ticketsRemaining: 180,
    entryCount: 0,
    totalCapacity: 500,
    entryRate: 0,
    timeToCapacity: 0,
    walletMZN: 120_000,
    walletUSD: 800,
    walletEUR: 400,
    settlementUSD: '2 days',
    settlementEUR: '3 days',
    availableFunds: 90_000,
    lockedFunds: 45_000,
    upcomingSettlement: 45_000,
    velocityData: [
      { time: 'Week 1', actual: 45_000, projected: 50_000 },
      { time: 'Week 2', actual: 95_000, projected: 110_000 },
      { time: 'Week 3', actual: 140_000, projected: 170_000 },
      { time: 'Week 4', actual: 180_000, projected: 210_000 },
      { time: 'Week 5', actual: null, projected: 250_000 },
    ],
    riskAlerts: [
      { id: '1', message: 'All Systems Operational', level: 'normal', icon: '✓' },
    ],
    incidents: [
      { id: '1', message: 'Early bird tickets sold out', level: 'success', time: '10:00' },
    ],
    payoutLogs: [
      { amount: 80_000, currency: 'MZN', status: 'success' },
    ],
    channelROI: [
      { name: 'WhatsApp', revenue: 60_000, conversion: 9.8 },
      { name: 'In-App Feed', revenue: 50_000, conversion: 6.4 },
      { name: 'Instagram', revenue: 40_000, conversion: 4.1 },
      { name: 'Direct Link', revenue: 30_000, conversion: 18.7 },
    ],
  },
];

export const useEventStore = create<EventStore>((set) => ({
  currentEventId: 'ttv',
  events: mockEvents,
  simulation: {
    refundSpike: false,
    gateSlowdown: false,
    apiLatency: false,
    highEntryRate: false,
  },
  setCurrentEvent: (id) => set({ currentEventId: id }),
  toggleSimulation: (key) =>
    set((state) => ({
      simulation: { ...state.simulation, [key]: !state.simulation[key] },
    })),
}));

// Derived hook - compute outside of store to avoid infinite re-renders
export function useCurrentEvent(): EventData {
  const currentEventId = useEventStore((s) => s.currentEventId);
  const events = useEventStore((s) => s.events);
  const simulation = useEventStore((s) => s.simulation);

  const event = events.find((e) => e.id === currentEventId)!;

  let modified = { ...event };
  let alerts = [...event.riskAlerts];
  let incidents = [...event.incidents];

  if (simulation.refundSpike) {
    alerts = [
      { id: 'sim-refund', message: 'Refund Spike Detected (+18%)', level: 'warning', icon: '⚠' },
      ...alerts,
    ];
    incidents = [
      { id: 'sim-r1', message: 'Refund spike: 18% above normal', level: 'warning', time: 'Now' },
      ...incidents,
    ];
  }

  if (simulation.gateSlowdown) {
    alerts = [
      { id: 'sim-gate', message: '2 Gate Devices Offline', level: 'critical', icon: '⚠' },
      ...alerts,
    ];
    modified.entryRate = Math.max(8, modified.entryRate - 30);
    modified.timeToCapacity = modified.timeToCapacity > 0 ? modified.timeToCapacity * 3 : 0;
    incidents = [
      { id: 'sim-g1', message: 'Gate 3 offline — hardware fault', level: 'warning', time: 'Now' },
      { id: 'sim-g2', message: 'Gate 5 offline — connection lost', level: 'warning', time: 'Now' },
      ...incidents,
    ];
  }

  if (simulation.apiLatency) {
    alerts = [
      { id: 'sim-api', message: 'M-Pesa API Latency High', level: 'warning', icon: '⚠' },
      ...alerts,
    ];
    incidents = [
      { id: 'sim-a1', message: 'M-Pesa response time: 4200ms', level: 'warning', time: 'Now' },
      ...incidents,
    ];
  }

  if (simulation.highEntryRate) {
    modified.entryRate = 120;
    modified.timeToCapacity = Math.max(5, Math.round((modified.totalCapacity - modified.entryCount) / 120));
    incidents = [
      { id: 'sim-h1', message: 'Entry surge detected: 120/min', level: 'warning', time: 'Now' },
      ...incidents,
    ];
  }

  return { ...modified, riskAlerts: alerts, incidents };
}
