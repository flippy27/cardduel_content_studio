export const CARD_TYPES = [
  { value: 0, label: "Unit" },
  { value: 1, label: "Utility" },
  { value: 2, label: "Equipment" },
  { value: 3, label: "Spell" }
] as const;

export const CARD_RARITIES = [
  { value: 0, label: "Common" },
  { value: 1, label: "Rare" },
  { value: 2, label: "Epic" },
  { value: 3, label: "Legendary" }
] as const;

export const CARD_FACTIONS = [
  { value: 0, label: "Ember", tone: "ember" },
  { value: 1, label: "Tidal", tone: "tidal" },
  { value: 2, label: "Grove", tone: "grove" },
  { value: 3, label: "Alloy", tone: "alloy" },
  { value: 4, label: "Void", tone: "void" }
] as const;

export const UNIT_TYPES = [
  { value: 0, label: "Melee" },
  { value: 1, label: "Ranged" },
  { value: 2, label: "Magic" }
] as const;

export const ALLOWED_ROWS = [
  { value: 0, label: "Front Only" },
  { value: 1, label: "Back Only" },
  { value: 2, label: "Flexible" }
] as const;

export const DEFAULT_ATTACK_SELECTORS = [
  { value: 0, label: "Self" },
  { value: 1, label: "Frontline First" },
  { value: 2, label: "Backline First" },
  { value: 3, label: "All Enemies" },
  { value: 4, label: "Lowest Health Ally" },
  { value: 5, label: "Ally Front" },
  { value: 6, label: "Ally Back Left" },
  { value: 7, label: "Ally Back Right" },
  { value: 8, label: "Source Opponent" }
] as const;

export const QUEUE_MODES = [
  { value: 0, label: "Casual" },
  { value: 1, label: "Ranked" },
  { value: 2, label: "Private" }
] as const;

export function labelFor(options: readonly { value: number; label: string }[], value?: number | null) {
  if (value === null || value === undefined) return "—";
  return options.find((item) => item.value === value)?.label ?? String(value);
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}
