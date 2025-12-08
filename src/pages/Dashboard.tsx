import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { 
  getWorkshops, 
  getRegistrations, 
  getFinancialSnapshots,
  isPaid, 
  formatCurrency, 
  formatDate, 
  Workshop, 
  Registration,
  FinancialSnapshot 
} from '@/lib/api';
import { cn } from '@/lib/utils';

interface WorkshopWithData extends Workshop {
  registrations: Registration[];
  latestSnapshot: FinancialSnapshot | null;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export default function Dashboard() {
  const [workshopsData, setWorkshopsData] = useState<WorkshopWithData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const workshops = await getWorkshops();
      
      const enriched = await Promise.all(
        workshops.map(async (w) => {
          const [regs, snaps] = await Promise.all([
            getRegistrations(w.id),
            getFinancialSnapshots(w.id),
          ]);
          
          const revenue = regs
            .filter(r => isPaid(r.payment_confirmed))
            .reduce((sum, r) => sum + (r.amount_rs || 0), 0);
          
          const latestSnapshot = snaps[0] || null;
          const profit = latestSnapshot?.profit ?? 0;
          const profitMargin = latestSnapshot?.profit_margin ?? 0;
          
          return {
            ...w,
            registrations: regs,
            latestSnapshot,
            revenue,
            profit,
            profitMargin,
          };
        })
      );
      
      setWorkshopsData(enriched);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate total monthly profit
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const thisMonthWorkshops = workshopsData.filter(w => {
    const date = new Date(w.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const totalMonthlyProfit = thisMonthWorkshops.reduce((sum, w) => sum + w.profit, 0);
  const totalMonthlyRevenue = thisMonthWorkshops.reduce((sum, w) => sum + w.revenue, 0);
  
  // Next upcoming workshop
  const upcomingWorkshops = workshopsData
    .filter(w => new Date(w.date) >= now && w.status !== 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextWorkshop = upcomingWorkshops[0];

  function getHealthClass(margin: number) {
    if (margin >= 50) return 'health-dot-green';
    if (margin >= 20) return 'health-dot-yellow';
    return 'health-dot-red';
  }

  function getProfitCardClass(profit: number) {
    if (profit > 0) return 'profit-card-positive';
    if (profit < 0) return 'profit-card-negative';
    return 'profit-card-neutral';
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
      <div className="space-y-8">
        {/* Header with Bank Account View */}
        <header className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">This Month's Profit</p>
              <p className={cn(
                "text-4xl sm:text-5xl font-bold tracking-tight",
                totalMonthlyProfit >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(totalMonthlyProfit)}
              </p>
              {totalMonthlyRevenue > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  from {formatCurrency(totalMonthlyRevenue)} revenue
                </p>
              )}
            </div>
            
            {nextWorkshop && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next Workshop</p>
                <Link 
                  to={`/workshops/${nextWorkshop.id}`}
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                >
                  {nextWorkshop.title}
                </Link>
                <p className="text-sm text-muted-foreground">{formatDate(nextWorkshop.date)}</p>
              </div>
            )}
          </div>
        </header>

        {/* Profit Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-label mb-0">Workshops</h2>
            <Link 
              to="/workshops" 
              className="text-sm text-primary hover:underline font-medium"
            >
              Manage
            </Link>
          </div>
          
          {workshopsData.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No workshops yet.</p>
              <Link to="/workshops" className="text-primary hover:underline text-sm">
                Create your first workshop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workshopsData.map((workshop) => (
                <Link
                  key={workshop.id}
                  to={`/workshops/${workshop.id}`}
                  className={cn(
                    "profit-card group hover:scale-[1.02] transition-transform cursor-pointer",
                    getProfitCardClass(workshop.profit)
                  )}
                >
                  <div className="space-y-3">
                    {/* Title & Date */}
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {workshop.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(workshop.date)}
                      </p>
                    </div>
                    
                    {/* Net Profit - Hero Number */}
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-2xl sm:text-3xl font-bold",
                        workshop.profit >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {formatCurrency(workshop.profit)}
                      </span>
                      {workshop.latestSnapshot && (
                        <span className={cn("health-dot", getHealthClass(workshop.profitMargin))} />
                      )}
                    </div>
                    
                    {/* Margin Bar */}
                    <div className="space-y-1">
                      <div className="margin-bar">
                        <div 
                          className="margin-bar-fill"
                          style={{ width: `${Math.max(0, Math.min(100, workshop.profitMargin))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Revenue: {formatCurrency(workshop.revenue)}</span>
                        <span>{workshop.profitMargin.toFixed(0)}% margin</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
