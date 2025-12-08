import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  getWorkshop, 
  getRegistrations, 
  getFinancialSnapshots,
  getOtherCosts,
  upsertRegistration,
  createFinancialSnapshot,
  createOtherCost,
  updateOtherCost,
  deleteOtherCost,
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
import { RefreshCw, ArrowLeft, Plus, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  // Cost editing state
  const [metaSpend, setMetaSpend] = useState('');
  const [costs, setCosts] = useState<{ id?: string; label: string; amount: string }[]>([]);
  const [saving, setSaving] = useState(false);

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
      setMetaSpend(snapshotsData[0]?.meta_spend?.toString() || '');
      setCosts(costsData.map(c => ({ id: c.id, label: c.label, amount: c.amount.toString() })));
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

  // Financial calculations
  const revenue = registrations
    .filter(r => isPaid(r.payment_confirmed))
    .reduce((sum, r) => sum + (r.amount_rs || 0), 0);

  const metaSpendNum = parseFloat(metaSpend) || 0;
  const otherCostsTotal = costs.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalCosts = metaSpendNum + otherCostsTotal;
  const profit = revenue - totalCosts;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  function getHealthClass(margin: number) {
    if (margin >= 50) return 'health-dot-green';
    if (margin >= 20) return 'health-dot-yellow';
    return 'health-dot-red';
  }

  function addCost() {
    setCosts([...costs, { label: '', amount: '' }]);
  }

  function removeCost(index: number) {
    const cost = costs[index];
    if (cost.id) {
      deleteOtherCost(cost.id).catch(console.error);
    }
    setCosts(costs.filter((_, i) => i !== index));
  }

  function updateCostField(index: number, field: 'label' | 'amount', value: string) {
    const newCosts = [...costs];
    newCosts[index] = { ...newCosts[index], [field]: value };
    setCosts(newCosts);
  }

  async function handleSaveSnapshot() {
    setSaving(true);
    try {
      for (const cost of costs) {
        if (!cost.label) continue;
        
        if (cost.id) {
          await updateOtherCost(cost.id, {
            label: cost.label,
            amount: parseFloat(cost.amount) || 0,
          });
        } else {
          const created = await createOtherCost({
            workshop_id: workshop!.id,
            label: cost.label,
            amount: parseFloat(cost.amount) || 0,
          });
          cost.id = created.id;
        }
      }

      await createFinancialSnapshot({
        workshop_id: workshop!.id,
        revenue,
        meta_spend: metaSpendNum,
        other_costs_total: otherCostsTotal,
        profit,
        profit_margin: profitMargin,
      });

      toast({ title: 'Financial snapshot saved' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error saving snapshot',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  const paidCount = registrations.filter(r => isPaid(r.payment_confirmed)).length;

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        {/* Receipt Container */}
        <div className="receipt">
          {/* Receipt Header */}
          <div className="receipt-header">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">{workshop.title}</h1>
                <p className="text-sm text-muted-foreground">{formatDate(workshop.date)}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{paidCount} / {registrations.length} paid</p>
              </div>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="receipt-body">
            {/* Revenue Line */}
            <div className="receipt-row">
              <span className="text-muted-foreground">+ Revenue</span>
              <span className="font-semibold text-success text-lg">
                {formatCurrency(revenue)}
              </span>
            </div>

            {/* Meta Ad Spend */}
            <div className="receipt-row">
              <span className="text-muted-foreground">− Ad Spend</span>
              <span className="font-medium text-destructive">
                {formatCurrency(metaSpendNum)}
              </span>
            </div>

            {/* Other Costs */}
            {costs.filter(c => c.label && parseFloat(c.amount)).map((cost, i) => (
              <div key={i} className="receipt-row">
                <span className="text-muted-foreground">− {cost.label}</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(parseFloat(cost.amount) || 0)}
                </span>
              </div>
            ))}

            {totalCosts > 0 && (
              <div className="receipt-row text-sm">
                <span className="text-muted-foreground">Total Costs</span>
                <span className="text-destructive">
                  {formatCurrency(totalCosts)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="receipt-divider" />

            {/* Net Profit - Hero */}
            <div className="receipt-total">
              <div className="flex items-center gap-2">
                <span>Net Profit</span>
                <span className={cn("health-dot", getHealthClass(profitMargin))} />
              </div>
              <span className={cn(
                profit >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(profit)}
              </span>
            </div>

            {/* Margin Display */}
            <div className="space-y-2">
              <div className="margin-bar">
                <div 
                  className="margin-bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, profitMargin))}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {profitMargin.toFixed(1)}% profit margin
              </p>
            </div>
          </div>

          {/* Edit Costs Section */}
          <div className="border-t border-border px-6 py-5 space-y-4 bg-muted/30">
            <p className="section-label">Edit Costs</p>
            
            <div className="space-y-2">
              <Label htmlFor="metaSpend" className="text-sm">Meta Ad Spend (Rs)</Label>
              <Input
                id="metaSpend"
                type="number"
                placeholder="0"
                value={metaSpend}
                onChange={(e) => setMetaSpend(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Other Costs</Label>
                <button
                  type="button"
                  onClick={addCost}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              
              {costs.map((cost, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder="Label"
                    value={cost.label}
                    onChange={(e) => updateCostField(index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={cost.amount}
                    onChange={(e) => updateCostField(index, 'amount', e.target.value)}
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCost(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive h-10 w-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSaveSnapshot} 
              disabled={saving}
              className="w-full"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Snapshot'}
            </Button>

            {snapshots.length > 0 && (
              <div className="pt-4 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Recent Snapshots</p>
                {snapshots.slice(0, 3).map((snap) => (
                  <div key={snap.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(snap.created_at)}</span>
                    <span className="text-foreground">
                      {formatCurrency(snap.profit)} ({snap.profit_margin.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Button - Full Width at Bottom */}
          <div className="p-4 border-t border-border bg-muted/50">
            <Button 
              onClick={handleSync} 
              disabled={syncing || !workshop.sheet_url}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
              {syncing ? 'Syncing...' : 'Sync from Google Sheet'}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
