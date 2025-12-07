import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: string;
  type?: 'payment' | 'workshop';
}

export function StatusPill({ status, type = 'payment' }: StatusPillProps) {
  const normalizedStatus = status?.toLowerCase().trim() || '';
  
  let className = 'status-pill';
  let displayText = status || 'Unknown';
  
  if (type === 'payment') {
    if (normalizedStatus === 'yes') {
      className = cn(className, 'status-pill-paid');
      displayText = 'Paid';
    } else if (normalizedStatus === 'pending') {
      className = cn(className, 'status-pill-pending');
      displayText = 'Pending';
    } else if (normalizedStatus === 'no') {
      className = cn(className, 'status-pill-no');
      displayText = 'No';
    } else {
      className = cn(className, 'status-pill-pending');
      displayText = status || 'Pending';
    }
  } else {
    // Workshop status
    if (normalizedStatus === 'draft') {
      className = cn(className, 'status-pill-draft');
      displayText = 'Draft';
    } else if (normalizedStatus === 'open') {
      className = cn(className, 'status-pill-open');
      displayText = 'Open';
    } else if (normalizedStatus === 'running') {
      className = cn(className, 'status-pill-running');
      displayText = 'Running';
    } else if (normalizedStatus === 'completed') {
      className = cn(className, 'status-pill-completed');
      displayText = 'Completed';
    } else {
      className = cn(className, 'status-pill-draft');
      displayText = status || 'Draft';
    }
  }
  
  return <span className={className}>{displayText}</span>;
}
