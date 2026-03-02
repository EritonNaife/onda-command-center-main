import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { getEventRoute } from '@/lib/eventRouting';
import type { TopEvent } from '@/types/dashboard';

interface TopEventsTableProps {
  events: TopEvent[];
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

const statusColor = (status: string | null) => {
  switch (status) {
    case 'published':
      return 'text-emerald-400 bg-emerald-400/10';
    case 'draft':
      return 'text-muted-foreground bg-white/[0.04]';
    case 'cancelled':
      return 'text-red-400 bg-red-400/10';
    default:
      return 'text-muted-foreground bg-white/[0.04]';
  }
};

export const TopEventsTable = ({ events }: TopEventsTableProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="glass-panel p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65 }}
    >
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Top Events by Sales</h3>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No event data yet
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground">Event</TableHead>
              <TableHead className="text-xs text-muted-foreground hidden sm:table-cell">Date</TableHead>
              <TableHead className="text-xs text-muted-foreground text-right">Sold</TableHead>
              <TableHead className="text-xs text-muted-foreground text-right">Revenue</TableHead>
              <TableHead className="text-xs text-muted-foreground hidden md:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow
                key={event.id}
                className="cursor-pointer border-white/[0.06] transition-colors hover:bg-white/[0.04]"
                onClick={() =>
                  navigate(
                    getEventRoute(event.id, {
                      status: event.status,
                    }),
                  )
                }
              >
                <TableCell className="font-medium text-foreground">
                  {event.name}
                </TableCell>
                <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                  {formatDate(event.start_date)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-foreground">
                  {event.tickets_sold.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-amber-400">
                  {formatCurrency(event.revenue)} MZN
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {event.status && (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColor(event.status)}`}
                    >
                      {event.status}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </motion.div>
  );
};
