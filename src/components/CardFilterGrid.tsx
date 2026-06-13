import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Circle, Cog, Crown, Droplet, Droplets, Flame, Gem, Leaf, Shield, Sparkles, Star, Swords, Wand2, FilterX } from "lucide-react";
import { DragSource } from "./DropZone";
import { cn, EmptyState, Input } from "./ui";
import type { CardDefinitionDto } from "../domain/types";
import { CARD_FACTIONS, CARD_RARITIES, CARD_TYPES, labelFor } from "../domain/constants";

type Ico = ComponentType<{ size?: number; className?: string }>;

const FACTION_FILTERS: { value: number; label: string; icon: Ico; fc: string }[] = [
  { value: 0, label: "Ember", icon: Flame, fc: "fc-ember" },
  { value: 1, label: "Tidal", icon: Droplets, fc: "fc-tidal" },
  { value: 2, label: "Grove", icon: Leaf, fc: "fc-grove" },
  { value: 3, label: "Alloy", icon: Cog, fc: "fc-alloy" },
  { value: 4, label: "Void", icon: Sparkles, fc: "fc-void" }
];
const RARITY_FILTERS: { value: number; label: string; icon: Ico }[] = [
  { value: 0, label: "Common", icon: Circle },
  { value: 1, label: "Rare", icon: Star },
  { value: 2, label: "Epic", icon: Gem },
  { value: 3, label: "Legendary", icon: Crown }
];
const TYPE_FILTERS: { value: number; label: string; icon: Ico }[] = [
  { value: 0, label: "Unit", icon: Swords },
  { value: 1, label: "Utility", icon: Wand2 },
  { value: 2, label: "Equipment", icon: Shield },
  { value: 3, label: "Spell", icon: Sparkles }
];
const MANA_BUCKETS: { id: string; label: string; min: number; max: number }[] = [
  { id: "0-2", label: "0-2", min: 0, max: 2 },
  { id: "3-5", label: "3-5", min: 3, max: 5 },
  { id: "6-7", label: "6-7", min: 6, max: 7 },
  { id: "8+", label: "8+", min: 8, max: 99 }
];

function toggle<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

function FilterButton({ active, onClick, icon: Icon, iconClass, label }: { active: boolean; onClick: () => void; icon?: Ico; iconClass?: string; label: string }) {
  return <button type="button" className={cn("filter-btn", active && "active")} onClick={onClick}>{Icon ? <Icon size={13} className={iconClass} /> : null}{label}</button>;
}

/**
 * Reusable filterable card browser: faction/rarity/type/mana icon-button filters
 * + search, rendering a compact draggable mini-card grid. Used by Deck Builder,
 * Card Studio (pick to edit) and Inventory (pick to grant).
 */
export function CardFilterGrid({ cards, onPick, counts, activeId, dragType = "cardduel/card", pickHint = "Click o arrastra" }: {
  cards: CardDefinitionDto[];
  onPick: (cardId: string) => void;
  counts?: Record<string, number>;
  activeId?: string | null;
  dragType?: string;
  pickHint?: string;
}) {
  const [filter, setFilter] = useState("");
  const [facs, setFacs] = useState<Set<number>>(new Set());
  const [rars, setRars] = useState<Set<number>>(new Set());
  const [types, setTypes] = useState<Set<number>>(new Set());
  const [manas, setManas] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => cards.filter((card) => {
    const text = `${card.displayName} ${card.cardId}`.toLowerCase().includes(filter.toLowerCase());
    const fac = !facs.size || facs.has(card.cardFaction);
    const rar = !rars.size || rars.has(card.cardRarity);
    const typ = !types.size || types.has(card.cardType);
    const mana = !manas.size || MANA_BUCKETS.some((b) => manas.has(b.id) && card.manaCost >= b.min && card.manaCost <= b.max);
    return text && fac && rar && typ && mana;
  }), [cards, filter, facs, rars, types, manas]);

  const anyFilter = Boolean(filter || facs.size || rars.size || types.size || manas.size);
  function clearFilters() { setFilter(""); setFacs(new Set()); setRars(new Set()); setTypes(new Set()); setManas(new Set()); }

  return <>
    <div className="filter-bar">
      <Input placeholder="Buscar carta..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="filter-group"><span className="filter-label">Facción</span>{FACTION_FILTERS.map((f) => <FilterButton key={f.value} active={facs.has(f.value)} onClick={() => setFacs((s) => toggle(s, f.value))} icon={f.icon} iconClass={f.fc} label={f.label} />)}</div>
      <div className="filter-group"><span className="filter-label">Rareza</span>{RARITY_FILTERS.map((r) => <FilterButton key={r.value} active={rars.has(r.value)} onClick={() => setRars((s) => toggle(s, r.value))} icon={r.icon} label={r.label} />)}</div>
      <div className="filter-group"><span className="filter-label">Tipo</span>{TYPE_FILTERS.map((t) => <FilterButton key={t.value} active={types.has(t.value)} onClick={() => setTypes((s) => toggle(s, t.value))} icon={t.icon} label={t.label} />)}</div>
      <div className="filter-group"><span className="filter-label">Mana</span>{MANA_BUCKETS.map((b) => <FilterButton key={b.id} active={manas.has(b.id)} onClick={() => setManas((s) => toggle(s, b.id))} icon={Droplet} label={b.label} />)}{anyFilter ? <button type="button" className="filter-btn clear" onClick={clearFilters}><FilterX size={13} /> Limpiar</button> : null}</div>
    </div>
    <div className="results-line">{filtered.length} de {cards.length} cartas</div>
    <div className="card-grid compact-scroll">
      {filtered.map((card) => {
        const tone = CARD_FACTIONS.find((f) => f.value === card.cardFaction)?.tone ?? "alloy";
        return <DragSource key={card.cardId} type={dragType} value={card.cardId} className={cn("mini-card", `mc-${tone}`, activeId === card.cardId && "active")} onClick={() => onPick(card.cardId)} title={pickHint}>
          <span className="mc-mana">{card.manaCost}</span>
          <strong>{card.displayName}</strong>
          <span className="mc-meta">{labelFor(CARD_FACTIONS, card.cardFaction)} · {labelFor(CARD_RARITIES, card.cardRarity)} · {labelFor(CARD_TYPES, card.cardType)}</span>
          <span className="mc-stats">⚔ {card.attack} · ♥ {card.health}{card.armor ? ` · 🛡 ${card.armor}` : ""}</span>
          {counts?.[card.cardId] ? <span className="mc-count">×{counts[card.cardId]}</span> : null}
        </DragSource>;
      })}
      {!filtered.length ? <EmptyState title="Sin resultados" body="Ajusta los filtros o la búsqueda." /> : null}
    </div>
  </>;
}
