import { useMemo } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { Registration, formatCurrency, isPaid } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FollowupsTabProps {
  registrations: Registration[];
}

export function FollowupsTab({ registrations }: FollowupsTabProps) {
  const unpaidRegistrations = useMemo(() => {
    return registrations.filter(r => !isPaid(r.payment_confirmed));
  }, [registrations]);

  const pendingCount = unpaidRegistrations.filter(r => 
    r.payment_confirmed?.toLowerCase().trim() === 'pending'
  ).length;
  
  const noCount = unpaidRegistrations.filter(r => 
    r.payment_confirmed?.toLowerCase().trim() === 'no'
  ).length;

  const otherCount = unpaidRegistrations.length - pendingCount - noCount;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {unpaidRegistrations.length > 0 && (
        <div className="bg-warning/10 text-warning-foreground rounded-xl p-4 text-sm">
          <strong>{unpaidRegistrations.length}</strong> {unpaidRegistrations.length === 1 ? 'person needs' : 'people need'} follow-up
          {pendingCount > 0 && <> • <strong>{pendingCount}</strong> Pending</>}
          {noCount > 0 && <> • <strong>{noCount}</strong> No</>}
          {otherCount > 0 && <> • <strong>{otherCount}</strong> Other</>}
        </div>
      )}

      {/* Table / Cards */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {unpaidRegistrations.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            All registrations are paid! No follow-ups needed.
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
                  {unpaidRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-muted/30">
                      <td className="p-3 text-foreground font-medium">{reg.full_name || '—'}</td>
                      <td className="p-3">
                        {reg.phone ? (
                          <a 
                            href={`tel:${reg.phone}`} 
                            className="text-primary hover:underline"
                          >
                            {reg.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
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
              {unpaidRegistrations.map((reg) => (
                <div key={reg.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{reg.full_name || '—'}</span>
                    <StatusPill status={reg.payment_confirmed || 'Pending'} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    {reg.phone ? (
                      <a href={`tel:${reg.phone}`} className="text-primary hover:underline">
                        {reg.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
    </div>
  );
}
