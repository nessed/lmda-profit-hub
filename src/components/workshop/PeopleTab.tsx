import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/StatusPill';
import { Registration, formatCurrency } from '@/lib/api';
import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PeopleTabProps {
  registrations: Registration[];
}

export function PeopleTab({ registrations }: PeopleTabProps) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return registrations.filter(r => {
      // Filter by payment status
      if (filter !== 'all') {
        const status = r.payment_confirmed?.toLowerCase().trim() || '';
        if (filter === 'yes' && status !== 'yes') return false;
        if (filter === 'no' && status !== 'no') return false;
        if (filter === 'pending' && status !== 'pending') return false;
      }
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = r.full_name?.toLowerCase().includes(searchLower);
        const phoneMatch = r.phone?.toLowerCase().includes(searchLower);
        if (!nameMatch && !phoneMatch) return false;
      }
      
      return true;
    });
  }, [registrations, filter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {registrations.length === 0 
              ? 'No registrations yet. Sync from Google Sheet to import.'
              : 'No registrations match your filters.'}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
                    <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((reg) => (
                    <tr key={reg.id} className="hover:bg-muted/30">
                      <td className="p-3 text-foreground">{reg.full_name || '—'}</td>
                      <td className="p-3 text-muted-foreground">{reg.phone || '—'}</td>
                      <td className="p-3">
                        <StatusPill status={reg.payment_confirmed || 'Pending'} />
                      </td>
                      <td className="p-3 text-right font-medium text-foreground">
                        {formatCurrency(reg.amount_rs || 0)}
                      </td>
                      <td className="p-3 max-w-[200px]">
                        {reg.notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground text-sm truncate block cursor-help">
                                {reg.notes.length > 40 ? reg.notes.substring(0, 40) + '...' : reg.notes}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs">
                              <p>{reg.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((reg) => (
                <div key={reg.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{reg.full_name || '—'}</span>
                    <StatusPill status={reg.payment_confirmed || 'Pending'} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{reg.phone || '—'}</span>
                    <span className="font-medium text-foreground">{formatCurrency(reg.amount_rs || 0)}</span>
                  </div>
                  {reg.notes && (
                    <p className="text-sm text-muted-foreground truncate">{reg.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {registrations.length} registrations
      </p>
    </div>
  );
}
