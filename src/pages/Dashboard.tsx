import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard } from '@/components/ui/KPICard';
import { StatusPill } from '@/components/ui/StatusPill';
import { getWorkshops, getRegistrations, isPaid, formatCurrency, formatDate, Workshop, Registration } from '@/lib/api';
import { ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [registrationData, setRegistrationData] = useState<Record<string, Registration[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const workshopsData = await getWorkshops();
      setWorkshops(workshopsData);
      
      // Load registrations for each workshop
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

  // Calculate monthly stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const allRegistrations = Object.values(registrationData).flat();
  const thisMonthRegistrations = allRegistrations.filter(r => {
    const date = new Date(r.created_at);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const totalRevenue = thisMonthRegistrations
    .filter(r => isPaid(r.payment_confirmed))
    .reduce((sum, r) => sum + (r.amount_rs || 0), 0);
  
  const totalRegistrations = thisMonthRegistrations.length;
  const paidRegistrations = thisMonthRegistrations.filter(r => isPaid(r.payment_confirmed)).length;
  const pendingRegistrations = totalRegistrations - paidRegistrations;

  // Active workshops (not completed)
  const activeWorkshops = workshops.filter(w => w.status !== 'completed');

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of active workshops and revenue.</p>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard 
            label="Revenue This Month" 
            value={formatCurrency(totalRevenue)}
          />
          <KPICard 
            label="Total Registrations" 
            value={totalRegistrations}
            subtext="This month"
          />
          <KPICard 
            label="Paid Registrations" 
            value={paidRegistrations}
            subtext="This month"
          />
          <KPICard 
            label="Pending Registrations" 
            value={pendingRegistrations}
            subtext="This month"
          />
        </div>

        {/* Active Workshops */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-label mb-0">Active Workshops</h2>
            <Link 
              to="/workshops" 
              className="text-sm text-primary hover:underline font-medium"
            >
              View all
            </Link>
          </div>
          
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {activeWorkshops.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No active workshops. <Link to="/workshops" className="text-primary hover:underline">Create one</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeWorkshops.map((workshop) => {
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
        </section>
      </div>
    </PageLayout>
  );
}
