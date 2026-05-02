import { useEffect, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "../components/ui";
import { ApiError } from "../api/http";
import type { CardDefinitionDto, ItemTypeDto, PlayerInventoryDto } from "../domain/types";

export function InventoryStudio({ ctx }: { ctx: StudioContext }) {
  const [items, setItems] = useState<ItemTypeDto[]>([]);
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [inventory, setInventory] = useState<PlayerInventoryDto | null>(null);
  const [itemKey, setItemKey] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [cardId, setCardId] = useState("");

  async function load() {
    try {
      const [itemResult, cardResult] = await Promise.all([ctx.api.items(), ctx.api.cards()]);
      setItems(itemResult);
      setCards(cardResult);
      if (!itemKey && itemResult[0]) setItemKey(itemResult[0].key);
      if (!cardId && cardResult[0]) setCardId(cardResult[0].cardId);
      if (ctx.auth) setInventory(await ctx.api.inventory(ctx.auth.userId));
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar inventario."); }
  }
  useEffect(() => { void load(); }, [ctx.auth?.userId]);

  async function grantItem() {
    if (!ctx.requireAuth() || !ctx.auth) return;
    try { await ctx.api.grantItem(ctx.auth.userId, { itemTypeKey: itemKey, quantity, reason: "content_studio" }); ctx.notify("success", "Items entregados."); await load(); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude entregar items."); }
  }
  async function grantCard() {
    if (!ctx.requireAuth() || !ctx.auth) return;
    try { await ctx.api.grantPlayerCard(ctx.auth.userId, { cardId, acquiredFrom: "content_studio" }); ctx.notify("success", "Carta entregada al jugador."); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude entregar carta."); }
  }

  return <>
    <PageHeader title="Inventory & Player Cards" eyebrow="Admin rápido" description="Entrega items o cartas al usuario autenticado para probar crafting, decks y colección sin SQL manual." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid">
      <Card>
        <h2>Grant item</h2>
        <div className="form-grid two">
          <Field label="Item"><Select value={itemKey} onChange={(e) => setItemKey(e.target.value)}>{items.map((item) => <option key={item.key} value={item.key}>{item.displayName} ({item.key})</option>)}</Select></Field>
          <Field label="Cantidad"><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></Field>
        </div>
        <Button onClick={grantItem}>Entregar items</Button>
        <h3 className="top-gap">Grant card</h3>
        <Field label="Carta"><Select value={cardId} onChange={(e) => setCardId(e.target.value)}>{cards.map((card) => <option key={card.cardId} value={card.cardId}>{card.displayName}</option>)}</Select></Field>
        <Button onClick={grantCard}>Entregar carta</Button>
      </Card>
      <Card>
        <h2>Inventario actual</h2>
        {inventory ? <div className="table-like">{inventory.items.map((item) => <div className="table-row" key={item.id}><strong>{item.itemTypeDisplayName}</strong><code>{item.itemTypeKey}</code><Badge tone="soft">{item.itemTypeCategory}</Badge><b>{item.quantity}</b></div>)}</div> : <EmptyState title="Sin inventario" body="Inicia sesión y refresca para verlo." />}
      </Card>
    </div>
  </>;
}
