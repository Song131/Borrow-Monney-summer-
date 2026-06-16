import { STATUS_BADGES } from '../lib/format';

export default function StatusBadge({ status }) {
  const [cls, label] = STATUS_BADGES[status] || ['', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}
