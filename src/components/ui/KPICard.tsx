interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export function KPICard({ label, value, subtext }: KPICardProps) {
  return (
    <div className="kpi-card animate-fade-in">
      <p className="section-label">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {subtext && (
        <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}
