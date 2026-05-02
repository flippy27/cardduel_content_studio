import { useEffect, useMemo, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "../components/ui";
import { ApiError } from "../api/http";
import type { CardCraftingInfoDto, ItemTypeDto } from "../domain/types";
import { labelFor, CARD_RARITIES } from "../domain/constants";

type ReqDraft = { itemTypeKey: string; quantityRequired: number };

export function CraftingStudio({ ctx }: { ctx: StudioContext }) {
  const [items, setItems] = useState<ItemTypeDto[]>([]);
  const [cards, setCards] = useState<CardCraftingInfoDto[]>([]);
  const [selected, setSelected] = useState("");
  const [requirements, setRequirements] = useState<ReqDraft[]>([]);

  async function load() {
    try {
      const [itemResult, craftingResult] = await Promise.all([ctx.api.items(), ctx.api.craftingCards()]);
      setItems(itemResult);
      setCards(craftingResult);
      if (!selected && craftingResult[0]) setSelected(craftingResult[0].cardId);
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar crafting.");
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const card = cards.find((item) => item.cardId === selected);
    if (card) setRequirements(card.requirements.map((req) => ({ itemTypeKey: req.itemTypeKey, quantityRequired: req.quantityRequired })));
  }, [selected, cards]);

  const selectedCard = useMemo(() => cards.find((card) => card.cardId === selected), [cards, selected]);

  async function save() {
    if (!ctx.requireAuth()) return;
    try {
      await ctx.api.setCraftingRequirements(selected, { requirements: requirements.filter((req) => req.itemTypeKey && req.quantityRequired > 0) });
      ctx.notify("success", "Requisitos de crafting guardados.");
      await load();
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude guardar requirements.");
    }
  }

  return <>
    <PageHeader title="Crafting Studio" eyebrow="Items → cards" description="Configura requirements de crafting por carta sin escribir JSON. Usa el catálogo real de item types." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid">
      <Card>
        <h2>Cartas craftables</h2>
        <div className="card-list compact-scroll">
          {cards.map((card) => <button key={card.cardId} className={selected === card.cardId ? "catalog-card active" : "catalog-card"} onClick={() => setSelected(card.cardId)}>
            <strong>{card.displayName}</strong><code>{card.cardId}</code><span>{labelFor(CARD_RARITIES, card.cardRarity)} · {card.requirements.length} reqs</span>{card.isCraftable ? <Badge tone="success">craftable</Badge> : <Badge tone="warning">sin reqs</Badge>}
          </button>)}
        </div>
      </Card>
      <Card>
        <h2>{selectedCard?.displayName ?? "Selecciona carta"}</h2>
        {selectedCard ? <>
          <div className="effect-builder">
            {requirements.map((req, index) => <div key={index} className="effect-row">
              <Field label="Item"><Select value={req.itemTypeKey} onChange={(event) => setRequirements((current) => current.map((item, i) => i === index ? { ...item, itemTypeKey: event.target.value } : item))}>{items.map((item) => <option key={item.key} value={item.key}>{item.displayName} ({item.key})</option>)}</Select></Field>
              <Field label="Cantidad"><Input type="number" min={1} max={9999} value={req.quantityRequired} onChange={(event) => setRequirements((current) => current.map((item, i) => i === index ? { ...item, quantityRequired: Number(event.target.value) } : item))} /></Field>
              <Button variant="danger" onClick={() => setRequirements((current) => current.filter((_, i) => i !== index))}>Eliminar</Button>
            </div>)}
          </div>
          <div className="toolbar"><Button variant="soft" onClick={() => setRequirements((current) => [...current, { itemTypeKey: items[0]?.key ?? "", quantityRequired: 1 }])}>+ Requirement</Button><Button onClick={save}>Guardar requirements</Button></div>
        </> : <EmptyState title="Sin carta" body="Selecciona una carta para editar sus requirements." />}
      </Card>
    </div>
  </>;
}
