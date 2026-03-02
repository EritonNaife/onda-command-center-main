import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { getEventRoute } from '@/lib/eventRouting';
import type { UpcomingEvent } from '@/types/dashboard';

interface UpcomingEventsTableProps {
  events: UpcomingEvent[];
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const UpcomingEventsTable = ({ events }: UpcomingEventsTableProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="glass-panel p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55 }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Upcoming Events</h3>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No upcoming events
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground">Event</TableHead>
              <TableHead className="text-xs text-muted-foreground">Date</TableHead>
              <TableHead className="text-xs text-muted-foreground hidden sm:table-cell">Venue</TableHead>
              <TableHead className="text-xs text-muted-foreground text-right">Tickets</TableHead>
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
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatDate(event.start_date)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {event.venue_name ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {event.venue_name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <span className="text-foreground">
                    {event.tickets_sold.toLocaleString()}
                  </span>
                  {event.max_capacity != null && (
                    <span className="text-muted-foreground">
                      /{event.max_capacity.toLocaleString()}
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
