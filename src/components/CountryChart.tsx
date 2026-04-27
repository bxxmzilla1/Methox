import { countryCodeToDisplayName } from "@/lib/country";

type Item = { code: string; count: number };

type Props = {
  items: Item[];
  totalClicks: number;
};

const BAR_GRADIENTS = [
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-teal-500 via-emerald-600 to-green-500",
  "from-cyan-500 via-emerald-500 to-teal-500",
  "from-green-500 via-teal-500 to-emerald-600",
  "from-emerald-600 via-cyan-500 to-teal-600",
];

export function CountryChart({ items, totalClicks }: Props) {
  if (!items.length || totalClicks < 1) return null;

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(24,24,27,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.06) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
        aria-hidden
      />

      <div className="relative z-[1] mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700/90">
          Visitors by country
        </span>
        <span className="text-[10px] font-medium text-zinc-500">
          {items.length} {items.length === 1 ? "region" : "regions"}
        </span>
      </div>

      <ul className="relative z-[1] max-h-44 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.9)_transparent]">
        {items.map(({ code, count }, i) => {
          const pctOfTotal = Math.round((count / totalClicks) * 100);
          const barPct = Math.max((count / max) * 100, 4);
          const grad = BAR_GRADIENTS[i % BAR_GRADIENTS.length];
          const countryName = countryCodeToDisplayName(code);

          return (
            <li key={code}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span
                  className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug text-zinc-800"
                  title={code && code.toUpperCase() !== "UNKNOWN" ? `${countryName} (${code})` : countryName}
                >
                  {countryName}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  <span className="font-medium text-zinc-800">{count}</span>
                  <span className="ml-1.5 text-[10px] text-zinc-400">({pctOfTotal}%)</span>
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-200/90 ring-1 ring-zinc-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${grad} shadow-sm shadow-emerald-500/25 transition-[width] duration-500 ease-out`}
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
