import type { DiagramVariant } from '@/lib/content/meta-ads/types';

/** Themed inline-SVG concept diagrams for the Meta Ads course. No external libraries. */
export function MetaDiagram({ variant }: { variant: DiagramVariant }) {
  const D = DIAGRAMS[variant];
  if (!D) return null;
  return (
    <div className="overflow-hidden rounded-[14px] border-2 border-[var(--ink)] bg-white p-4 shadow-[3px_3px_0_var(--ink)]">
      <D />
    </div>
  );
}

const box = (x: number, y: number, w: number, h: number, label: string, color: string, sub?: string) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="8" fill={`${color}2e`} stroke="var(--ink)" strokeWidth="1.5" />
    <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 4)} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">{label}</text>
    {sub && <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fontSize="8.5" fill="var(--text-subtle)">{sub}</text>}
  </g>
);

const arrow = (x1: number, y1: number, x2: number, y2: number, color = 'var(--ink)') => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.75" markerEnd="url(#m-arrow)" />
);

function Defs() {
  return (
    <defs>
      <marker id="m-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
        <path d="M0,0 L6,3.5 L0,7 Z" fill="var(--ink)" />
      </marker>
    </defs>
  );
}

/* Tiramisu palette: purple, blue, teal, amber, red. */
const A = '#6c3bff', B = '#045099', C = '#17a398', W = '#f5a623', P = '#e51f27';

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
      <text x="160" y="146" textAnchor="middle" fontSize="9.5" fill="var(--text-subtle)">Great creative lifts the blue + green boxes, </text>
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
      <text x="160" y="134" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">A weak final number is caused by a weak link earlier, diagnose top-down.</text>
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
      <text x="160" y="146" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">Run both, deduplicated. CAPI recovers events the browser drops.</text>
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
  'creative-formats': () => (
    <svg viewBox="0 0 320 160" className="w-full"><Defs />
      <text x="160" y="16" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">Pick the canvas that fits the message</text>
      {box(12, 30, 70, 100, 'Reel', P, '9:16 video')}
      {box(90, 30, 70, 100, 'Story', W, '9:16 full')}
      {box(168, 55, 64, 50, 'Image', B, '1:1')}
      {box(240, 40, 68, 80, 'Carousel', C, 'swipe')}
      <text x="160" y="150" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">Vertical video is native to feeds and cheapest to reach. Start there.</text>
    </svg>
  ),
  'learning-phase': () => (
    <svg viewBox="0 0 320 160" className="w-full"><Defs />
      <text x="160" y="16" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">The learning phase settles after ~50 events</text>
      <line x1="30" y1="120" x2="300" y2="120" stroke="var(--border-strong)" strokeWidth="1" />
      <line x1="30" y1="30" x2="30" y2="120" stroke="var(--border-strong)" strokeWidth="1" />
      <path d="M30,110 C70,40 90,100 110,70 C130,45 150,95 170,72" fill="none" stroke={`${W}`} strokeWidth="2" />
      <path d="M170,72 C210,68 260,64 300,62" fill="none" stroke={`${C}`} strokeWidth="2" />
      <line x1="170" y1="30" x2="170" y2="120" stroke={`${A}88`} strokeWidth="1" strokeDasharray="3 3" />
      <text x="95" y="44" textAnchor="middle" fontSize="8.5" fill="var(--warn)">Learning · erratic cost</text>
      <text x="245" y="52" textAnchor="middle" fontSize="8.5" fill="var(--success)">Stable · optimised</text>
      <text x="170" y="134" textAnchor="middle" fontSize="8.5" fill="var(--accent-text)">~50 conversions / ad set / week</text>
    </svg>
  ),
  'testing-matrix': () => (
    <svg viewBox="0 0 320 150" className="w-full"><Defs />
      <text x="160" y="16" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">Change ONE variable per test</text>
      {box(20, 30, 84, 30, 'Same audience', B)}
      {box(20, 66, 84, 30, 'Same budget', B)}
      {box(20, 102, 84, 30, 'Same offer', B)}
      <text x="128" y="90" textAnchor="middle" fontSize="16" fill="var(--text-subtle)">→</text>
      {box(150, 48, 76, 30, 'Creative A', C)}
      {box(234, 48, 76, 30, 'Creative B', W)}
      <text x="188" y="100" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">only this differs</text>
      <text x="226" y="118" textAnchor="middle" fontSize="8.5" fill="var(--text-subtle)">so the winner is unambiguous</text>
    </svg>
  ),
  'fatigue-curve': () => (
    <svg viewBox="0 0 320 160" className="w-full"><Defs />
      <text x="160" y="16" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">As frequency climbs, performance fades</text>
      <line x1="30" y1="120" x2="300" y2="120" stroke="var(--border-strong)" strokeWidth="1" />
      <line x1="30" y1="30" x2="30" y2="120" stroke="var(--border-strong)" strokeWidth="1" />
      <path d="M30,105 C90,95 130,80 180,62 C230,46 270,40 300,38" fill="none" stroke={`${B}`} strokeWidth="2" />
      <text x="150" y="52" fontSize="8.5" fill="var(--info)">CPM / frequency ↑</text>
      <path d="M30,50 C90,60 140,80 200,98 C240,108 270,112 300,114" fill="none" stroke={`${W}`} strokeWidth="2" />
      <text x="210" y="90" fontSize="8.5" fill="var(--warn)">CTR / ROAS ↓</text>
      <text x="165" y="140" textAnchor="middle" fontSize="8.5" fill="var(--text-subtle)">Refresh the creative before the lines cross.</text>
    </svg>
  ),
  'scaling-paths': () => (
    <svg viewBox="0 0 320 160" className="w-full"><Defs />
      {box(115, 12, 90, 30, 'A winner', C, 'proven ad set')}
      {arrow(140, 42, 80, 66, A)} {arrow(180, 42, 240, 66, A)}
      {box(14, 68, 128, 34, 'Vertical', B, 'raise its budget')}
      {box(178, 68, 128, 34, 'Horizontal', W, 'duplicate / new audiences')}
      <text x="78" y="120" textAnchor="middle" fontSize="8.5" fill="var(--text-subtle)">fast, but resets learning</text>
      <text x="242" y="120" textAnchor="middle" fontSize="8.5" fill="var(--text-subtle)">stable, but more to manage</text>
      <text x="160" y="146" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">Scale slow enough to keep the algorithm learning.</text>
    </svg>
  ),
};
