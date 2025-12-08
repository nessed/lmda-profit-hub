import { useEffect, useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { getAllAttendance, formatTime, calculateHours, AttendanceWithProfile } from '@/lib/attendanceApi';
import { formatDate } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StaffLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AttendanceWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const data = await getAllAttendance();
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
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
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">Staff Attendance Logs</h1>
          <p className="text-muted-foreground">Track employee clock-in and clock-out times</p>
        </div>

        {logs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No attendance records yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Employee
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Clock In
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Clock Out
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => {
                    const isActive = !log.clock_out_time;
                    return (
                      <tr key={log.id} className={cn(isActive && "bg-success/5")}>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {log.profiles?.email || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(log.shift_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground font-mono">
                          {formatTime(log.clock_in_time)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {log.clock_out_time ? (
                            <span className="text-foreground">{formatTime(log.clock_out_time)}</span>
                          ) : (
                            <span className="text-success">Active</span>
                          )}
                        </td>
                        <td className={cn(
                          "px-4 py-3 text-sm font-medium font-mono",
                          isActive ? "text-success" : "text-foreground"
                        )}>
                          {calculateHours(log.clock_in_time, log.clock_out_time)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {logs.map((log) => {
                const isActive = !log.clock_out_time;
                return (
                  <div 
                    key={log.id} 
                    className={cn("p-4 space-y-2", isActive && "bg-success/5")}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">
                          {log.profiles?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(log.shift_date)}
                        </p>
                      </div>
                      <span className={cn(
                        "text-sm font-medium font-mono",
                        isActive ? "text-success" : "text-foreground"
                      )}>
                        {calculateHours(log.clock_in_time, log.clock_out_time)}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm font-mono">
                      <span className="text-muted-foreground">
                        In: <span className="text-foreground">{formatTime(log.clock_in_time)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Out: {log.clock_out_time ? (
                          <span className="text-foreground">{formatTime(log.clock_out_time)}</span>
                        ) : (
                          <span className="text-success">Active</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
