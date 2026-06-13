import { useEffect, useMemo, useState } from "react";
import { Hammer } from "lucide-react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { CardFilterGrid } from "../components/CardFilterGrid";
import { Badge, Button, Card, cn, EffectRow, EmptyState, Field, Input, SectionHeading, Select, Toolbar } from "../components/ui";
import { ApiError } from "../api/http";
import type { CardCraftingInfoDto, CardDefinitionDto, ItemTypeDto } from "../domain/types";

type ReqDraft = { itemTypeKey: string; quantityRequired: number };

export function CraftingStudio({ ctx }: { ctx: StudioContext }) {
  const [items, setItems] = useState<ItemTypeDto[]>([]);
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [crafting, setCrafting] = useState<CardCraftingInfoDto[]>([]);
  const [selected, setSelected] = useState("");
  const [requirements, setRequirements] = useState<ReqDraft[]>([]);
  const [onlyCraftable, setOnlyCraftable] = useState(false);

  async function load() {
    // crafting/cards only returns already-configured cards, so list the FULL
    // catalog and overlay which ones already have requirements.
    const [itemR, cardR, craftR] = await Promise.allSettled([ctx.api.items(), ctx.api.cards(), ctx.api.craftingCards()]);
    if (itemR.status === "fulfilled") setItems(itemR.value);
    if (cardR.status === "fulfilled") setCards(cardR.value);
    else ctx.notify("error", cardR.reason instanceof ApiError ? cardR.reason.message : "No pude cargar el catálogo.");
    if (craftR.status === "fulfilled") setCrafting(craftR.value);
  }

  useEffect(() => { void load(); }, []);

  // cardId -> existing requirements (for the editor and the ×N badges).
  const reqMap = useMemo(() => {
    const map = new Map<string, ReqDraft[]>();
    for (const c of crafting) map.set(c.cardId, c.requirements.map((r) => ({ itemTypeKey: r.itemTypeKey, quantityRequired: r.quantityRequired })));
    return map;
  }, [crafting]);
  const reqCounts = useMemo(() => Object.fromEntries(crafting.map((c) => [c.cardId, c.requirements.length])), [crafting]);

  function selectCard(cardId: string) {
    setSelected(cardId);
    setRequirements(reqMap.get(cardId) ?? []);
  }

  const selectedCard = cards.find((c) => c.cardId === selected);
  const shownCards = useMemo(() => onlyCraftable ? cards.filter((c) => (reqCounts[c.cardId] ?? 0) > 0) : cards, [cards, onlyCraftable, reqCounts]);

  async function save() {
    if (!ctx.requireAuth() || !selected) return;
    try {
      await ctx.api.setCraftingRequirements(selected, { requirements: requirements.filter((req) => req.itemTypeKey && req.quantityRequired > 0) });
      ctx.notify("success", requirements.length ? "Requirements guardados (carta craftable)." : "Carta marcada como NO craftable.");
      await load();
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude guardar requirements.");
    }
  }

  return <>
    <PageHeader title="Crafting Studio" eyebrow="Items → cards" description="Una carta es 'craftable' cuando le defines requirements (items + cantidades). Elige cualquier carta del catálogo y configúralos. El badge ×N marca las que ya tienen requirements." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid wide-left">
      <Card>
        <SectionHeading title="Catálogo de cartas" actions={<button type="button" className={cn("filter-btn", onlyCraftable && "active")} onClick={() => setOnlyCraftable((v) => !v)}><Hammer size={13} /> Solo craftables ({crafting.length})</button>} />
        <CardFilterGrid cards={shownCards} onPick={selectCard} counts={reqCounts} activeId={selected} pickHint="Click para configurar crafting" />
      </Card>
      <Card>
        <h2>{selectedCard?.displayName ?? "Selecciona una carta"}</h2>
        {selectedCard ? <>
          <div className="pill-row" style={{ marginBottom: 8 }}>
            <code>{selectedCard.cardId}</code>
            {requirements.length ? <Badge tone="success">craftable · {requirements.length} reqs</Badge> : <Badge tone="warning">sin requirements</Badge>}
          </div>
          <div className="effect-builder">
            {requirements.map((req, index) => <EffectRow key={index} onRemove={() => setRequirements((current) => current.filter((_, i) => i !== index))}>
              <Field label="Item"><Select value={req.itemTypeKey} onChange={(event) => setRequirements((current) => current.map((item, i) => i === index ? { ...item, itemTypeKey: event.target.value } : item))}>{items.map((item) => <option key={item.key} value={item.key}>{item.displayName} ({item.key})</option>)}</Select></Field>
              <Field label="Cantidad"><Input type="number" min={1} max={9999} value={req.quantityRequired} onChange={(event) => setRequirements((current) => current.map((item, i) => i === index ? { ...item, quantityRequired: Number(event.target.value) } : item))} /></Field>
            </EffectRow>)}
            {!requirements.length ? <EmptyState title="Sin requirements" body="Agrega items para hacerla craftable." /> : null}
          </div>
          <Toolbar><Button variant="soft" onClick={() => setRequirements((current) => [...current, { itemTypeKey: items[0]?.key ?? "", quantityRequired: 1 }])}>+ Requirement</Button><Button onClick={save}>Guardar requirements</Button></Toolbar>
        </> : <EmptyState title="Sin carta" body="Selecciona una carta del catálogo para editar sus requirements." />}
      </Card>
    </div>
  </>;
}
