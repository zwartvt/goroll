import { SLOTS, RARITY_COLOR, RARITY_BONUS, RARITY_LABEL, ITEM_CATEGORIES, isWeapon, type Item, type Rarity } from "@/lib/game";
import { RarityBadge } from "@/components/app/RarityBadge";

export function ItemView({ item }: { item: Item }) {
  const isEq = item.category === "equipo" || !item.category;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-display text-lg" style={isEq ? { color: RARITY_COLOR[item.rarity as Rarity] } : undefined}>{item.name}</h3>
          <p className="text-xs text-muted-foreground">
            {isEq
              ? SLOTS.find(s => s.key === item.slot)?.label
              : ITEM_CATEGORIES.find(c => c.key === item.category)?.label || "Objeto"}
          </p>
        </div>
        {isEq && <RarityBadge rarity={item.rarity as Rarity} />}
      </div>
      {isEq ? (
        <p className="text-sm">
          {isWeapon(item.slot as any)
            ? <>Daño permanente: <strong className="text-[var(--gold)]">+{item.damage_bonus}</strong></>
            : <>Defensa <strong className="text-[var(--gold)]">+{item.defense_bonus || RARITY_BONUS[item.rarity as Rarity].def}</strong> · Vida <strong className="text-[var(--gold)]">+{item.hp_bonus || RARITY_BONUS[item.rarity as Rarity].hp}</strong></>}
        </p>
      ) : (item.uses ?? 0) > 0 && (
        <p className="text-sm">Usos restantes: <strong className="text-[var(--gold)]">{item.uses}{item.max_uses ? `/${item.max_uses}` : ""}</strong></p>
      )}
      {isEq && <p className="text-xs text-muted-foreground">Rareza: {RARITY_LABEL[item.rarity as Rarity]}</p>}
      {item.description && <p className="text-xs text-muted-foreground italic">"{item.description}"</p>}
    </div>
  );
}