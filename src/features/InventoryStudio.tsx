import { useEffect, useMemo, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { CardFilterGrid } from "../components/CardFilterGrid";
import { Badge, Button, Card, cn, CatalogItem, EmptyState, Field, Input, ScrollList, SectionHeading } from "../components/ui";
import { ApiError } from "../api/http";
import type { CardDefinitionDto, ItemTypeDto, PlayerInventoryDto } from "../domain/types";

type Collection = { userId: string; totalCards: number; cards: Array<{ id: string; cardId: string; displayName: string; cardRarity: number; cardFaction: number; cardType: number; acquiredFrom: string; acquiredAt: string }> };

export function InventoryStudio({ ctx }: { ctx: StudioContext }) {
  const [items, setItems] = useState<ItemTypeDto[]>([]);
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [inventory, setInventory] = useState<PlayerInventoryDto | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [itemKey, setItemKey] = useState("");
  const [quantity, setQuantity] = useState(100);
  // filters
  const [itemSearch, setItemSearch] = useState("");
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [invSearch, setInvSearch] = useState("");
  const [collSearch, setCollSearch] = useState("");

  async function load() {
    try {
      const [itemResult, cardResult] = await Promise.all([ctx.api.items(), ctx.api.cards()]);
      setItems(itemResult);
      setCards(cardResult);
      if (!itemKey && itemResult[0]) setItemKey(itemResult[0].key);
      if (ctx.auth) {
        const [inv, coll] = await Promise.all([ctx.api.inventory(ctx.auth.userId), ctx.api.playerCards(ctx.auth.userId)]);
        setInventory(inv);
        setCollection(coll);
      }
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar inventario."); }
  }
  useEffect(() => { void load(); }, [ctx.auth?.userId]);

  async function reloadPlayer() {
    if (!ctx.auth) return;
    try {
      const [inv, coll] = await Promise.all([ctx.api.inventory(ctx.auth.userId), ctx.api.playerCards(ctx.auth.userId)]);
      setInventory(inv); setCollection(coll);
    } catch { /* ignore */ }
  }

  async function grantItem() {
    if (!ctx.requireAuth() || !ctx.auth || !itemKey) return;
    try {
      await ctx.api.grantItem(ctx.auth.userId, { itemTypeKey: itemKey, quantity, reason: "content_studio" });
      ctx.notify("success", `Entregados ${quantity}x ${itemKey}.`);
      await reloadPlayer();
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude entregar items."); }
  }
  async function grantCard(cardId: string) {
    if (!ctx.requireAuth() || !ctx.auth) return;
    try {
      await ctx.api.grantPlayerCard(ctx.auth.userId, { cardId, acquiredFrom: "content_studio" });
      ctx.notify("success", `Carta ${cardId} entregada.`);
      await reloadPlayer();
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude entregar carta."); }
  }

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);
  const filteredItems = useMemo(() => items.filter((i) =>
    (!cats.size || cats.has(i.category)) &&
    `${i.displayName} ${i.key}`.toLowerCase().includes(itemSearch.toLowerCase())
  ), [items, cats, itemSearch]);

  const invItems = useMemo(() => (inventory?.items ?? []).filter((it) =>
    `${it.itemTypeDisplayName} ${it.itemTypeKey} ${it.itemTypeCategory}`.toLowerCase().includes(invSearch.toLowerCase())
  ), [inventory, invSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, { displayName: string; count: number }>();
    for (const c of collection?.cards ?? []) {
      const cur = map.get(c.cardId) ?? { displayName: c.displayName, count: 0 };
      cur.count++; map.set(c.cardId, cur);
    }
    return Array.from(map.entries())
      .map(([cardId, v]) => ({ cardId, ...v }))
      .filter((g) => `${g.displayName} ${g.cardId}`.toLowerCase().includes(collSearch.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [collection, collSearch]);

  function toggleCat(c: string) { setCats((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; }); }
  const selectedItem = items.find((i) => i.key === itemKey);

  return <>
    <PageHeader title="Inventory & Player Cards" eyebrow="Admin rápido" description="Entrega items o cartas al jugador autenticado. Filtra el catálogo y la colección para encontrar todo rápido." actions={<Button onClick={load}>Refrescar</Button>} />

    <Card>
      <SectionHeading title="Entregar carta" sub="Click en una carta para añadir una copia a la colección del jugador" />
      <CardFilterGrid cards={cards} onPick={grantCard} pickHint="Click para entregar al jugador" />
    </Card>

    <div className="split-grid">
      <Card>
        <h2>Entregar item</h2>
        <div className="form-grid two">
          <Field label="Cantidad"><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></Field>
          <Field label="Seleccionado"><Input disabled value={selectedItem ? `${selectedItem.displayName}` : "—"} /></Field>
        </div>
        <div className="actions-right"><Button onClick={grantItem} disabled={!itemKey}>Entregar {quantity}x</Button></div>
        <div className="filter-bar top-gap">
          <Input placeholder="Buscar item..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
          <div className="filter-group"><span className="filter-label">Categoría</span>{categories.map((c) => <button key={c} type="button" className={cn("filter-btn", cats.has(c) && "active")} onClick={() => toggleCat(c)}>{c}</button>)}</div>
        </div>
        <div className="results-line">{filteredItems.length} de {items.length} items</div>
        <ScrollList>
          {filteredItems.map((it) => <CatalogItem key={it.key} active={itemKey === it.key} onClick={() => setItemKey(it.key)} title={it.displayName} code={it.key} subtitle={`stack ${it.maxStack}`}>
            <Badge tone="soft">{it.category}</Badge>
          </CatalogItem>)}
          {!filteredItems.length ? <EmptyState title="Sin items" body="Ajusta búsqueda o categoría." /> : null}
        </ScrollList>
      </Card>

      <Card>
        <SectionHeading title="Inventario del jugador" actions={<Input placeholder="Filtrar..." value={invSearch} onChange={(e) => setInvSearch(e.target.value)} />} />
        {inventory ? <div className="table-like">
          {invItems.map((item) => <div className="table-row" key={item.id}><strong>{item.itemTypeDisplayName}</strong><code>{item.itemTypeKey}</code><Badge tone="soft">{item.itemTypeCategory}</Badge><b>{item.quantity}</b></div>)}
          {!invItems.length ? <EmptyState title="Sin items" body="Sin resultados para el filtro." /> : null}
        </div> : <EmptyState title="Sin inventario" body="Inicia sesión y refresca para verlo." />}

        <SectionHeading level={3} title={`Colección de cartas · ${collection?.totalCards ?? 0}`} actions={<Input placeholder="Filtrar..." value={collSearch} onChange={(e) => setCollSearch(e.target.value)} />} />
        {collection ? <div className="table-like">
          {grouped.map((g) => <div className="table-row" key={g.cardId}><strong>{g.displayName}</strong><code>{g.cardId}</code><span /><b>×{g.count}</b></div>)}
          {!grouped.length ? <EmptyState title="Sin cartas" body="Entrega cartas con el grid de arriba." /> : null}
        </div> : <EmptyState title="Sin colección" body="Inicia sesión y refresca para verla." />}
      </Card>
    </div>
  </>;
}
