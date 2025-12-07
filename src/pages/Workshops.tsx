import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getWorkshops, getRegistrations, createWorkshop, isPaid, formatCurrency, formatDate, Workshop, Registration } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChevronRight } from 'lucide-react';

export default function Workshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [registrationData, setRegistrationData] = useState<Record<string, Registration[]>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    ticket_price: '',
    sheet_url: '',
  });
  const [creating, setCreating] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const workshopsData = await getWorkshops();
      setWorkshops(workshopsData);
      
      const regData: Record<string, Registration[]> = {};
      await Promise.all(
        workshopsData.map(async (w) => {
          const regs = await getRegistrations(w.id);
          regData[w.id] = regs;
        })
      );
      setRegistrationData(regData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.title || !formData.date) {
      toast({
        title: 'Error',
        description: 'Please fill in title and date',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      await createWorkshop({
        title: formData.title,
        date: formData.date,
        ticket_price: formData.ticket_price ? parseFloat(formData.ticket_price) : 0,
        sheet_url: formData.sheet_url || undefined,
        user_id: user!.id,
      });
      
      toast({ title: 'Workshop created successfully' });
      setFormData({ title: '', date: '', ticket_price: '', sheet_url: '' });
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error creating workshop',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Workshops</h1>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Workshop
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workshop</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Workshop title"
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ticket_price">Ticket Price (Rs)</Label>
                  <Input
                    id="ticket_price"
                    type="number"
                    placeholder="0"
                    value={formData.ticket_price}
                    onChange={(e) => setFormData(p => ({ ...p, ticket_price: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sheet_url">Google Sheet URL</Label>
                  <Input
                    id="sheet_url"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={formData.sheet_url}
                    onChange={(e) => setFormData(p => ({ ...p, sheet_url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Make sure the sheet is set to "Anyone with the link can view"
                  </p>
                </div>
                
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Workshop'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {workshops.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No workshops yet. Click "New Workshop" to create one.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {workshops.map((workshop) => {
                const regs = registrationData[workshop.id] || [];
                const paid = regs.filter(r => isPaid(r.payment_confirmed)).length;
                const revenue = regs
                  .filter(r => isPaid(r.payment_confirmed))
                  .reduce((sum, r) => sum + (r.amount_rs || 0), 0);
                
                return (
                  <Link
                    key={workshop.id}
                    to={`/workshops/${workshop.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-foreground truncate">
                          {workshop.title}
                        </h3>
                        <StatusPill status={workshop.status} type="workshop" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatDate(workshop.date)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6 text-right">
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-foreground">
                          {paid} / {regs.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Paid</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
