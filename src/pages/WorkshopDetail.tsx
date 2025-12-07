import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard } from '@/components/ui/KPICard';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/button';
import { SnapshotTab } from '@/components/workshop/SnapshotTab';
import { MoneyMarginTab } from '@/components/workshop/MoneyMarginTab';
import { PeopleTab } from '@/components/workshop/PeopleTab';
import { FollowupsTab } from '@/components/workshop/FollowupsTab';
import { AttendanceTab } from '@/components/workshop/AttendanceTab';
import { 
  getWorkshop, 
  getRegistrations, 
  getFinancialSnapshots,
  getOtherCosts,
  upsertRegistration,
  isPaid, 
  formatCurrency, 
  formatDate, 
  Workshop, 
  Registration,
  FinancialSnapshot,
  OtherCost
} from '@/lib/api';
import { fetchAndParseSheet } from '@/lib/sheetParser';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'snapshot' | 'money' | 'people' | 'followups' | 'attendance';

const tabs: { id: TabType; label: string }[] = [
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'money', label: 'Money & Margin' },
  { id: 'people', label: 'People' },
  { id: 'followups', label: 'Follow-ups' },
  { id: 'attendance', label: 'Attendance' },
];

export default function WorkshopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('snapshot');

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      const [workshopData, regsData, snapshotsData, costsData] = await Promise.all([
        getWorkshop(id!),
        getRegistrations(id!),
        getFinancialSnapshots(id!),
        getOtherCosts(id!),
      ]);
      
      if (!workshopData) {
        navigate('/workshops');
        return;
      }
      
      setWorkshop(workshopData);
      setRegistrations(regsData);
      setSnapshots(snapshotsData);
      setOtherCosts(costsData);
    } catch (error) {
      console.error('Error loading workshop:', error);
      toast({
        title: 'Error loading workshop',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!workshop?.sheet_url) {
      toast({
        title: 'No sheet URL',
        description: 'Please add a Google Sheet URL to this workshop first.',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    try {
      const parsed = await fetchAndParseSheet(workshop.sheet_url);
      
      // Upsert all registrations
      for (const reg of parsed) {
        await upsertRegistration({
          workshop_id: workshop.id,
          raw_row_index: reg.rowIndex,
          full_name: reg.fullName,
          phone: reg.phone,
          email: reg.email,
          notes: reg.notes,
          payment_confirmed: reg.paymentConfirmed,
          amount_rs: reg.amountRs,
        });
      }
      
      toast({ title: `Synced ${parsed.length} registrations` });
      loadData();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync failed',
        description: error.message || 'Could not fetch or parse the sheet',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </PageLayout>
    );
  }

  if (!workshop) return null;

  // Calculate stats
  const totalRegs = registrations.length;
  const paidRegs = registrations.filter(r => isPaid(r.payment_confirmed)).length;
  const revenue = registrations
    .filter(r => isPaid(r.payment_confirmed))
    .reduce((sum, r) => sum + (r.amount_rs || 0), 0);
  const latestSnapshot = snapshots[0];
  const profit = latestSnapshot?.profit ?? 0;

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/workshops')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workshops
        </button>

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{workshop.title}</h1>
              <StatusPill status={workshop.status} type="workshop" />
            </div>
            <p className="text-muted-foreground mt-1">
              Workshop • {formatDate(workshop.date)}
            </p>
          </div>
          
          <Button 
            onClick={handleSync} 
            disabled={syncing || !workshop.sheet_url}
            variant="outline"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync from Google Sheet'}
          </Button>
        </header>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard label="Registrations" value={totalRegs} />
          <KPICard label="Paid" value={paidRegs} />
          <KPICard label="Revenue" value={formatCurrency(revenue)} />
          <KPICard label="Profit" value={latestSnapshot ? formatCurrency(profit) : '—'} />
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'tab-item whitespace-nowrap',
                  activeTab === tab.id && 'tab-item-active'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'snapshot' && (
            <SnapshotTab registrations={registrations} />
          )}
          {activeTab === 'money' && (
            <MoneyMarginTab 
              workshopId={workshop.id}
              registrations={registrations}
              snapshots={snapshots}
              otherCosts={otherCosts}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'people' && (
            <PeopleTab registrations={registrations} />
          )}
          {activeTab === 'followups' && (
            <FollowupsTab registrations={registrations} />
          )}
          {activeTab === 'attendance' && (
            <AttendanceTab />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
