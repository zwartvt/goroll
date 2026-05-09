import { RARITY_COLOR, RARITY_LABEL, type Rarity } from "@/lib/game";
export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        color: RARITY_COLOR[rarity],
        background: `color-mix(in oklab, ${RARITY_COLOR[rarity]} 15%, transparent)`,
        border: `1px solid color-mix(in oklab, ${RARITY_COLOR[rarity]} 50%, transparent)`,
      }}>
      {RARITY_LABEL[rarity]}
    </span>
  );
}
