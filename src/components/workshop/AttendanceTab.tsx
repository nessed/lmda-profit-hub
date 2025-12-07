import { Clock } from 'lucide-react';

export function AttendanceTab() {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <h3 className="font-semibold text-foreground text-lg mb-2">
        Attendance (Coming Soon)
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        This will show who actually attended the workshop vs who registered and paid.
      </p>
    </div>
  );
}
