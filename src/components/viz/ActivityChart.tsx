'use client';

/** A compact 14-day XP bar chart, inline SVG so it needs no chart library. */
export function ActivityChart({ data, goal }: { data: { date: string; xp: number }[]; goal: number }) {
  const days = padTo14(data);
  const max = Math.max(goal, ...days.map((d) => d.xp), 1);
  const w = 100 / days.length;

  return (
    <svg viewBox="0 0 100 40" className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
      {/* goal line */}
      <line x1="0" x2="100" y1={40 - (goal / max) * 36} y2={40 - (goal / max) * 36} stroke="var(--border-strong)" strokeWidth="0.3" strokeDasharray="1 1" />
      {days.map((d, i) => {
        const h = (d.xp / max) * 36;
        const hit = d.xp >= goal;
        return (
          <rect
            key={i}
            x={i * w + w * 0.15}
            y={40 - h}
            width={w * 0.7}
            height={Math.max(h, d.xp > 0 ? 1 : 0)}
            rx="0.6"
            fill={hit ? 'var(--success)' : d.xp > 0 ? 'var(--accent)' : 'var(--surface-3)'}
          >
            <title>{d.date}: {d.xp} XP</title>
          </rect>
        );
      })}
    </svg>
  );
}

function padTo14(data: { date: string; xp: number }[]): { date: string; xp: number }[] {
  if (data.length >= 14) return data.slice(-14);
  const pad = Array.from({ length: 14 - data.length }, () => ({ date: '', xp: 0 }));
  return [...pad, ...data];
}
