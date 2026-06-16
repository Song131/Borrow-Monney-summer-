export default function ProgressBar({ percent, variant }) {
  const pct = Math.min(100, Math.max(0, percent));
  return (
    <div className="progress">
      <div className={variant ? `progress-bar ${variant}` : 'progress-bar'} style={{ width: `${pct}%` }} />
    </div>
  );
}
