export function Sparkline({ points, color }: { points: string; color: string }) {
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-8 w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}
