import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShiftStatusCard } from '@/components/employee/ShiftStatusCard';
import { createWorkshop } from '@/lib/api';
import { fetchAndParseSheet } from '@/lib/sheetParser';
import { upsertRegistration } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeSetup() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ title: string; count: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title || !date) {
      toast({ 
        title: 'Missing fields', 
        description: 'Please enter title and date',
        variant: 'destructive' 
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create workshop
      const workshop = await createWorkshop({
        title,
        date,
        ticket_price: parseFloat(ticketPrice) || 0,
        sheet_url: sheetUrl || undefined,
        user_id: user!.id,
      });

      let syncedCount = 0;

      // If sheet URL provided, sync registrations
      if (sheetUrl) {
        try {
          const parsed = await fetchAndParseSheet(sheetUrl);
          
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
          
          syncedCount = parsed.length;
        } catch (syncError: any) {
          console.error('Sync error:', syncError);
          // Workshop created but sync failed - still show success
          toast({
            title: 'Workshop created',
            description: 'Could not sync sheet: ' + syncError.message,
          });
        }
      }

      setSuccess({ title, count: syncedCount });
      
      // Reset form
      setTitle('');
      setDate('');
      setTicketPrice('');
      setSheetUrl('');
    } catch (error: any) {
      toast({
        title: 'Failed to create workshop',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddAnother() {
    setSuccess(null);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/auth/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header with only logout */}
      <header className="border-b border-border bg-card/50">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Shift Status Card */}
        <ShiftStatusCard />

        {/* Workshop Creation */}
        {success ? (
          <div className="bg-card border-2 border-success/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-success">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Workshop Created</p>
                <p className="text-sm text-muted-foreground">
                  "{success.title}" with {success.count} registrations synced
                </p>
              </div>
            </div>
            <Button
              onClick={handleAddAnother}
              variant="outline"
              className="w-full min-h-[52px]"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Workshop
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="text-center pb-2">
              <h1 className="text-xl font-semibold text-foreground">New Workshop</h1>
              <p className="text-sm text-muted-foreground">Enter workshop details</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Workshop Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Leadership Training"
                  className="min-h-[48px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-[48px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketPrice">Ticket Price (Rs)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder="0"
                  className="min-h-[48px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sheetUrl">Google Sheet URL</Label>
                <Input
                  id="sheetUrl"
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/..."
                  className="min-h-[48px]"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. If provided, registrations will be synced automatically.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full min-h-[56px] text-lg font-semibold"
            >
              {submitting ? 'Creating...' : 'Submit & Sync'}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
