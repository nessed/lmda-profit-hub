import { Registration, isPaid, formatCurrency } from '@/lib/api';

interface SnapshotTabProps {
  registrations: Registration[];
}

export function SnapshotTab({ registrations }: SnapshotTabProps) {
  const total = registrations.length;
  const paid = registrations.filter(r => isPaid(r.payment_confirmed)).length;
  const pending = registrations.filter(r => {
    const status = r.payment_confirmed?.toLowerCase().trim();
    return status === 'pending';
  }).length;
  const notPaid = total - paid;
  
  const paidPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;
  const totalPaidAmount = registrations
    .filter(r => isPaid(r.payment_confirmed))
    .reduce((sum, r) => sum + (r.amount_rs || 0), 0);
  const avgPayment = paid > 0 ? Math.round(totalPaidAmount / paid) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Status Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="section-label">Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Registered</span>
            <span className="font-medium text-foreground">{total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-medium text-foreground">{paid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending</span>
            <span className="font-medium text-foreground">{pending}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unpaid</span>
            <span className="font-medium text-foreground">{notPaid}</span>
          </div>
        </div>
      </div>

      {/* Highlights Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="section-label">Highlights</h3>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">
            No registrations yet. Click "Sync from Google Sheet" to import data.
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{paidPercentage}% of registrations have paid.</span>
            </li>
            {notPaid > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{notPaid} {notPaid === 1 ? 'person' : 'people'} still pending payment.</span>
              </li>
            )}
            {avgPayment > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Average payment per participant: {formatCurrency(avgPayment)}.</span>
              </li>
            )}
            {paid === total && total > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>All registrations are fully paid!</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
