type Item = { code: string; count: number };

type Props = {
  items: Item[];
  totalClicks: number;
};

const BAR_GRADIENTS = [
  "from-emerald-400 via-teal-400 to-cyan-500",
  "from-teal-400 via-emerald-500 to-green-500",
  "from-cyan-400 via-emerald-500 to-teal-500",
  "from-green-400 via-teal-500 to-emerald-600",
  "from-emerald-500 via-cyan-400 to-teal-600",
];

export function CountryChart({ items, totalClicks }: Props) {
  if (!items.length || totalClicks < 1) return null;

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-4 shadow-inner shadow-black/20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
        aria-hidden
      />

      <div className="relative z-[1] mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500/90">
          Visitors by country
        </span>
        <span className="text-[10px] text-zinc-500">
          {items.length} {items.length === 1 ? "region" : "regions"}
        </span>
      </div>

      <ul className="relative z-[1] max-h-44 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(63,63,70,0.8)_transparent]">
        {items.map(({ code, count }, i) => {
          const pctOfTotal = Math.round((count / totalClicks) * 100);
          const barPct = Math.max((count / max) * 100, 4);
          const grad = BAR_GRADIENTS[i % BAR_GRADIENTS.length];

          return (
            <li key={code}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-mono text-[11px] font-medium tracking-wide text-zinc-200">
                  {code}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-400">
                  <span className="text-zinc-200">{count}</span>
                  <span className="ml-1.5 text-[10px] text-zinc-500">({pctOfTotal}%)</span>
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-zinc-700/50">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${grad} shadow-[0_0_14px_rgba(52,211,153,0.35)] transition-[width] duration-500 ease-out`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
