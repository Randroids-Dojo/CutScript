import type { BackendStatus } from '../types/project';

const STATUS_COLORS: Record<BackendStatus, string> = {
  online:   'bg-green-500',
  offline:  'bg-red-500',
  checking: 'bg-yellow-500 animate-pulse',
};

const STATUS_LABELS: Record<BackendStatus, string> = {
  online:   'Backend online',
  offline:  'Backend offline',
  checking: 'Connecting to backend…',
};

export default function BackendStatusDot({
  status,
  className = '',
}: {
  status: BackendStatus;
  className?: string;
}) {
  return (
    <div
      title={STATUS_LABELS[status]}
      className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[status]} ${className}`}
    />
  );
}
