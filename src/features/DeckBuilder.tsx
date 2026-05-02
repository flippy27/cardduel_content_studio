import { useEffect, useMemo, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { DragSource, DropZone } from "../components/DropZone";
import { Badge, Button, Card, EmptyState, Field, Input } from "../components/ui";
import { ApiError } from "../api/http";
import type { CardDefinitionDto } from "../domain/types";
import { CARD_FACTIONS, CARD_RARITIES, labelFor, slugify } from "../domain/constants";

export function DeckBuilder({ ctx }: { ctx: StudioContext }) {
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [deckId, setDeckId] = useState("starter_custom");
  const [displayName, setDisplayName] = useState("Starter Custom");
  const [deck, setDeck] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setCards(await ctx.api.cards()); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar cartas."); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => cards.filter((card) => `${card.displayName} ${card.cardId}`.toLowerCase().includes(filter.toLowerCase())), [cards, filter]);
  const counts = useMemo(() => deck.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {}), [deck]);
  const isValid = deck.length >= 20 && deck.length <= 30 && Object.values(counts).every((count) => count <= 3);

  function addCard(cardId: string) {
    const nextCount = (counts[cardId] ?? 0) + 1;
    if (nextCount > 3) return ctx.notify("error", "El backend valida máximo 3 copias por carta en este proyecto.");
    if (deck.length >= 30) return ctx.notify("error", "Máximo 30 cartas por deck.");
    setDeck((items) => [...items, cardId]);
  }

  function removeAt(index: number) {
    setDeck((items) => items.filter((_, i) => i !== index));
  }

  async function save() {
    if (!ctx.requireAuth() || !ctx.auth) return;
    setSaving(true);
    try {
      await ctx.api.upsertDeck({ playerId: ctx.auth.userId, deckId, displayName, cardIds: deck });
      ctx.notify("success", "Deck guardado correctamente.");
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude guardar el deck.");
    } finally { setSaving(false); }
  }

  return <>
    <PageHeader title="Deck Builder" eyebrow="Drag & drop" description="Arrastra cartas al deck. El contador te marca reglas antes de llamar al PUT /api/v1/decks." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid">
      <Card>
        <div className="section-heading"><h2>Cartas disponibles</h2><Input placeholder="Buscar carta..." value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
        <div className="card-list compact-scroll">
          {filtered.map((card) => <DragSource key={card.cardId} type="cardduel/card" value={card.cardId} className="catalog-card drag-card">
            <strong>{card.displayName}</strong><code>{card.cardId}</code><span>{labelFor(CARD_FACTIONS, card.cardFaction)} · {labelFor(CARD_RARITIES, card.cardRarity)} · {card.manaCost} mana</span>
          </DragSource>)}
        </div>
      </Card>
      <Card>
        <h2>Deck actual</h2>
        <div className="form-grid two">
          <Field label="Nombre"><Input value={displayName} onChange={(e) => { setDisplayName(e.target.value); if (!deckId) setDeckId(slugify(e.target.value)); }} /></Field>
          <Field label="Deck ID"><Input value={deckId} onChange={(e) => setDeckId(slugify(e.target.value))} /></Field>
        </div>
        <div className="deck-health">
          <Badge tone={deck.length >= 20 ? "success" : "warning"}>{deck.length}/20 mínimo</Badge>
          <Badge tone={deck.length <= 30 ? "success" : "danger"}>{deck.length}/30 máximo</Badge>
          <Badge tone={Object.values(counts).every((count) => count <= 3) ? "success" : "danger"}>≤3 copias</Badge>
        </div>
        <DropZone accept="cardduel/card" onDropValue={addCard} className="deck-drop">
          <strong>Suelta cartas aquí</strong>
          <span>También puedes hacer click en eliminar por cada copia.</span>
        </DropZone>
        <div className="deck-list compact-scroll">
          {deck.map((cardId, index) => {
            const card = cards.find((item) => item.cardId === cardId);
            return <div key={`${cardId}-${index}`} className="deck-entry"><span>{index + 1}</span><strong>{card?.displayName ?? cardId}</strong><code>{cardId}</code><Button variant="ghost" onClick={() => removeAt(index)}>Quitar</Button></div>;
          })}
          {!deck.length ? <EmptyState title="Deck vacío" body="Arrastra cartas desde la izquierda." /> : null}
        </div>
        <div className="actions-right"><Button onClick={save} disabled={!isValid || saving}>{saving ? "Guardando..." : "Guardar deck"}</Button></div>
      </Card>
    </div>
  </>;
}
