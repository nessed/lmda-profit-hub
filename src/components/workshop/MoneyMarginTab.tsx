import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Registration, 
  FinancialSnapshot, 
  OtherCost,
  isPaid, 
  formatCurrency, 
  formatDate,
  createFinancialSnapshot,
  createOtherCost,
  updateOtherCost,
  deleteOtherCost,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Save } from 'lucide-react';

interface MoneyMarginTabProps {
  workshopId: string;
  registrations: Registration[];
  snapshots: FinancialSnapshot[];
  otherCosts: OtherCost[];
  onUpdate: () => void;
}

export function MoneyMarginTab({ 
  workshopId, 
  registrations, 
  snapshots, 
  otherCosts,
  onUpdate 
}: MoneyMarginTabProps) {
  const [metaSpend, setMetaSpend] = useState(snapshots[0]?.meta_spend?.toString() || '');
  const [costs, setCosts] = useState<{ id?: string; label: string; amount: string }[]>(
    otherCosts.map(c => ({ id: c.id, label: c.label, amount: c.amount.toString() }))
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const revenue = registrations
    .filter(r => isPaid(r.payment_confirmed))
    .reduce((sum, r) => sum + (r.amount_rs || 0), 0);

  const metaSpendNum = parseFloat(metaSpend) || 0;
  const otherCostsTotal = costs.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalCosts = metaSpendNum + otherCostsTotal;
  const profit = revenue - totalCosts;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

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
      // Save/update other costs
      for (const cost of costs) {
        if (!cost.label) continue;
        
        if (cost.id) {
          await updateOtherCost(cost.id, {
            label: cost.label,
            amount: parseFloat(cost.amount) || 0,
          });
        } else {
          const created = await createOtherCost({
            workshop_id: workshopId,
            label: cost.label,
            amount: parseFloat(cost.amount) || 0,
          });
          cost.id = created.id;
        }
      }

      // Create financial snapshot
      await createFinancialSnapshot({
        workshop_id: workshopId,
        revenue,
        meta_spend: metaSpendNum,
        other_costs_total: otherCostsTotal,
        profit,
        profit_margin: profitMargin,
      });

      toast({ title: 'Financial snapshot saved' });
      onUpdate();
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

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="section-label">Financial Summary</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-semibold text-foreground text-lg">{formatCurrency(revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Costs</span>
              <span className="font-medium text-foreground">{formatCurrency(totalCosts)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit</span>
              <span className={`font-semibold text-lg ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(profit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margin</span>
              <span className="font-medium text-foreground">
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Costs Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="section-label">Costs</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaSpend">Meta Ad Spend (Rs)</Label>
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
              <Label>Other Costs</Label>
              <button
                type="button"
                onClick={addCost}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add cost
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
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCost(index)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Snapshot Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-medium text-foreground">Save Financial Snapshot</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Record the current financial state for this workshop
            </p>
          </div>
          <Button onClick={handleSaveSnapshot} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Snapshot'}
          </Button>
        </div>

        {snapshots.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="section-label">Recent Snapshots</p>
            <div className="space-y-2">
              {snapshots.slice(0, 3).map((snap) => (
                <div key={snap.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(snap.created_at)}</span>
                  <span className="text-foreground">
                    Profit: {formatCurrency(snap.profit)} ({snap.profit_margin.toFixed(0)}% margin)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
