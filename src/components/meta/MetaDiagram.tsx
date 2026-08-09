import type { DiagramVariant } from '@/lib/content/meta-ads/types';

/** Themed inline-SVG concept diagrams for the Meta Ads course. No external libraries. */
export function MetaDiagram({ variant }: { variant: DiagramVariant }) {
  const D = DIAGRAMS[variant];
  if (!D) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
      <D />
    </div>
  );
}

const box = (x: number, y: number, w: number, h: number, label: string, color: string, sub?: string) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="8" fill={`${color}1a`} stroke={`${color}66`} />
    <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 4)} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">{label}</text>
    {sub && <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fontSize="8.5" fill="var(--text-subtle)">{sub}</text>}
  </g>
);

const arrow = (x1: number, y1: number, x2: number, y2: number, color = 'var(--border-strong)') => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" markerEnd="url(#m-arrow)" />
);

function Defs() {
  return (
    <defs>
      <marker id="m-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
        <path d="M0,0 L6,3.5 L0,7 Z" fill="var(--border-strong)" />
      </marker>
    </defs>
  );
}

const A = '#7c6cf6', B = '#3b82f6', C = '#34d399', W = '#fbbf24', P = '#f472b6';

const DIAGRAMS: Record<DiagramVariant, () => React.ReactElement> = {
  'campaign-structure': () => (
    <svg viewBox="0 0 320 190" className="w-full"><Defs />
      {box(110, 8, 100, 34, 'Campaign', A, 'the GOAL')}
      {arrow(160, 42, 90, 62)} {arrow(160, 42, 230, 62)}
      {box(30, 64, 120, 34, 'Ad set A', B, 'audience · budget')}
      {box(170, 64, 120, 34, 'Ad set B', B, 'audience · budget')}
      {arrow(70, 98, 55, 118)} {arrow(110, 98, 125, 118)}
      {arrow(210, 98, 195, 118)} {arrow(250, 98, 265, 118)}
      {box(20, 120, 70, 30, 'Ad', C, 'creative')}
      {box(95, 120, 70, 30, 'Ad', C, 'creative')}
      {box(165, 120, 70, 30, 'Ad', C, 'creative')}
      {box(240, 120, 70, 30, 'Ad', C, 'creative')}
      <text x="160" y="180" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">Goal flows down · budget is spent by the ad sets</text>
    </svg>
  ),
  auction: () => (
    <svg viewBox="0 0 320 170" className="w-full"><Defs />
      <text x="160" y="16" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">Total Value wins the impression</text>
      {box(15, 34, 90, 32, 'Bid', W, 'your $')}
      <text x="112" y="54" textAnchor="middle" fontSize="14" fill="var(--text-subtle)">×</text>
      {box(120, 34, 90, 32, 'Action rate', B, 'will they act?')}
      <text x="217" y="54" textAnchor="middle" fontSize="14" fill="var(--text-subtle)">+</text>
      {box(225, 34, 82, 32, 'Ad quality', C, 'relevance')}
      {arrow(160, 66, 160, 86, A)}
      {box(90, 88, 140, 34, 'Total Value', A, 'highest wins')}
      <text x="160" y="146" textAnchor="middle" fontSize="9.5" fill="var(--text-subtle)">Great creative lifts the blue + green boxes —</text>
      <text x="160" y="159" textAnchor="middle" fontSize="9.5" fill="var(--accent-text)">so you win while bidding less.</text>
    </svg>
  ),
  'metrics-flow': () => (
    <svg viewBox="0 0 320 150" className="w-full"><Defs />
      {box(8, 20, 58, 30, 'Impress.', B, 'CPM')}
      {arrow(66, 35, 82, 35)}
      {box(84, 20, 52, 30, 'Clicks', B, 'CTR')}
      {arrow(136, 35, 152, 35)}
      {box(154, 20, 66, 30, 'Landing', W, 'CVR')}
      {arrow(220, 35, 236, 35)}
      {box(238, 20, 74, 30, 'Purchase', C, 'CPA')}
      {box(84, 78, 152, 34, 'ROAS = revenue ÷ spend', A, 'the whole chain in one number')}
      {arrow(160, 50, 160, 78, A)}
      <text x="160" y="134" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">A weak final number is caused by a weak link earlier — diagnose top-down.</text>
    </svg>
  ),
  'pixel-flow': () => (
    <svg viewBox="0 0 320 160" className="w-full"><Defs />
      {box(20, 20, 90, 34, 'Your site', B, 'user acts')}
      {arrow(110, 30, 205, 30)}
      <text x="157" y="24" textAnchor="middle" fontSize="8" fill="var(--text-subtle)">pixel (browser)</text>
      {box(207, 20, 96, 34, 'Meta', A, 'learns & optimises')}
      {box(20, 90, 90, 34, 'Your server', C, 'same events')}
      {arrow(110, 100, 205, 60)}
      <text x="150" y="92" textAnchor="middle" fontSize="8" fill="var(--text-subtle)">CAPI (server)</text>
      <text x="160" y="146" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">Run both, deduplicated — CAPI recovers events the browser drops.</text>
    </svg>
  ),
  audiences: () => (
    <svg viewBox="0 0 320 160" className="w-full"><Defs />
      {box(10, 40, 92, 44, 'Core', B, 'cold · interests')}
      {box(114, 40, 92, 44, 'Custom', W, 'warm · your data')}
      {box(218, 40, 92, 44, 'Lookalike', P, 'cold · modelled')}
      {arrow(160, 84, 260, 84, P)}
      <text x="210" y="104" textAnchor="middle" fontSize="8" fill="var(--text-subtle)">seed → find similar</text>
      <text x="160" y="24" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">Three ways to define who sees your ads</text>
      <text x="160" y="140" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">A lookalike is only as good as the Custom Audience you seed it with.</text>
    </svg>
  ),
  funnel: () => (
    <svg viewBox="0 0 320 160" className="w-full"><Defs />
      <polygon points="40,20 280,20 235,60 85,60" fill={`${B}1a`} stroke={`${B}66`} />
      <polygon points="85,66 235,66 200,106 120,106" fill={`${W}1a`} stroke={`${W}66`} />
      <polygon points="120,112 200,112 175,148 145,148" fill={`${C}1a`} stroke={`${C}66`} />
      <text x="160" y="45" textAnchor="middle" fontSize="11" fill="var(--text)">Awareness</text>
      <text x="160" y="91" textAnchor="middle" fontSize="11" fill="var(--text)">Consideration</text>
      <text x="160" y="135" textAnchor="middle" fontSize="10" fill="var(--text)">Conversion</text>
    </svg>
  ),
  cbo: () => (
    <svg viewBox="0 0 320 150" className="w-full"><Defs />
      {box(110, 12, 100, 32, 'Campaign $', A, 'one budget')}
      {arrow(150, 44, 70, 70, A)} {arrow(160, 44, 160, 70, A)} {arrow(170, 44, 250, 70, A)}
      {box(20, 72, 90, 30, 'Ad set', B, '55%')}
      {box(115, 72, 90, 30, 'Ad set', B, '30%')}
      {box(210, 72, 90, 30, 'Ad set', B, '15%')}
      <text x="160" y="128" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">CBO lets Meta flow the budget to whichever ad set performs.</text>
    </svg>
  ),
  'creative-anatomy': () => (
    <svg viewBox="0 0 320 150" className="w-full"><Defs />
      {box(20, 20, 120, 110, 'Visual', B, 'the scroll-stopper')}
      {box(150, 20, 150, 26, 'Hook', W, 'first 3 seconds')}
      {box(150, 52, 150, 26, 'Primary text', C)}
      {box(150, 84, 150, 26, 'Headline', A)}
      {box(150, 116, 150, 22, 'CTA button', P)}
    </svg>
  ),
};
