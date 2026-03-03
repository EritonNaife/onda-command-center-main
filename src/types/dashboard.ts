export interface EventCounts {
  total: number;
  draft: number;
  published: number;
  cancelled: number;
}

export interface TicketSales {
  total_tickets_sold: number;
  total_tickets_available: number;
  sell_through_rate: number;
}

export interface Revenue {
  total_revenue: number;
  currency: string;
}

export interface UpcomingEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string | null;
  venue_name: string | null;
  tickets_sold: number;
  max_capacity: number | null;
}

export interface TopEvent {
  id: string;
  name: string;
  start_date: string;
  tickets_sold: number;
  revenue: number;
  status: string | null;
}

export interface CheckInStats {
  total_tickets: number;
  checked_in: number;
  checked_out: number;
  currently_inside: number;
}

export interface DashboardOverview {
  event_counts: EventCounts;
  ticket_sales: TicketSales;
  revenue: Revenue;
  upcoming_events: UpcomingEvent[];
  top_events: TopEvent[];
  check_in_stats: CheckInStats;
}

export interface LiveEventMeta {
  id: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  is_live: boolean;
}

export interface LiveEventCrowd {
  current_occupancy: number;
  entry_rate_per_minute: number;
  capacity: number;
  capacity_percentage: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface LiveEventRevenue {
  actual_mzn: number;
  projected_mzn: number;
  average_ticket_price: number;
  tickets_sold: number;
  tickets_remaining: number;
  revenue_per_minute: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface LiveEventAlert {
  id: string;
  severity: 'warning' | 'critical';
  type: 'entry_rate' | 'capacity' | 'revenue_velocity';
  message: string;
  triggered_at: string;
  dismissed: boolean;
  dismissed_by?: string;
  dismissed_at?: string;
}

export interface LiveEventDataSourceStatus {
  moveApi: 'ok' | 'error' | 'stale';
  paymentsApi: 'ok' | 'error' | 'stale';
}

export interface LiveEventChannelROI {
  name: string;
  revenue: number;
  conversion: number;
}

export interface LiveEventPayoutLog {
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed';
}

export interface LiveEventFinance {
  wallet_mzn: number;
  wallet_usd: number;
  wallet_eur: number;
  available_funds: number;
  locked_funds: number;
  upcoming_settlement: number;
  settlement_usd: string;
  settlement_eur: string;
  payout_logs: LiveEventPayoutLog[];
}

export interface LiveEventVelocityPoint {
  time: string;
  actual: number;
  projected: number;
  tickets_sold: number;
}

export interface LiveEventSnapshot {
  eventId: string;
  organizationId: string;
  event: LiveEventMeta;
  crowd: LiveEventCrowd;
  revenue: LiveEventRevenue;
  alerts: LiveEventAlert[];
  channelROI: LiveEventChannelROI[];
  finance: LiveEventFinance;
  velocity_history: LiveEventVelocityPoint[];
  incidents: unknown[];
  timestamp: string;
  dataSourceStatus: LiveEventDataSourceStatus;
}

export interface LiveDashboardRiskAlert {
  id: string;
  message: string;
  level: 'normal' | 'warning' | 'critical';
  icon: string;
  alertId?: string;
}

export interface LiveDashboardIncident {
  id: string;
  message: string;
  level: 'success' | 'warning' | 'info';
  time: string;
  alertId?: string;
}

export interface LiveDashboardPayoutLog {
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed';
}

export interface LiveDashboardChannelROI {
  name: string;
  revenue: number;
  conversion: number;
}

export interface LiveDashboardVelocityPoint {
  time: string;
  actual: number | null;
  projected: number;
}

export interface LiveDashboardEvent {
  id: string;
  name: string;
  shortName: string;
  isLive: boolean;
  totalRevenue: number;
  projectedRevenue: number;
  breakEvenTarget: number;
  ticketsSold: number;
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
  velocityData: LiveDashboardVelocityPoint[];
  riskAlerts: LiveDashboardRiskAlert[];
  incidents: LiveDashboardIncident[];
  payoutLogs: LiveDashboardPayoutLog[];
  channelROI: LiveDashboardChannelROI[];
  status: string;
}

export interface LiveDashboardViewModel {
  currentEvent: LiveDashboardEvent;
  dataSourceStatus: LiveEventDataSourceStatus;
  lastUpdated: string;
  raw: LiveEventSnapshot;
}

export interface EventSwitcherOption {
  id: string;
  name: string;
  status: string | null;
  isLive: boolean;
}
