export default function Logomark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="2" y="9" width="22" height="16" rx="5" fill="currentColor" opacity="0.18" />
      <rect x="8" y="4" width="22" height="16" rx="5" fill="currentColor" />
      <circle cx="19" cy="12" r="3.4" fill="var(--gold, #d6ab4e)" />
    </svg>
  );
}
