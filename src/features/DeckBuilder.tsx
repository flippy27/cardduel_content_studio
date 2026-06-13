import { useEffect, useMemo, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { DropZone } from "../components/DropZone";
import { CardFilterGrid } from "../components/CardFilterGrid";
import { Badge, Button, Card, EmptyState, Field, Input } from "../components/ui";
import { ApiError } from "../api/http";
import type { CardDefinitionDto } from "../domain/types";
import { slugify } from "../domain/constants";

export function DeckBuilder({ ctx }: { ctx: StudioContext }) {
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [deckId, setDeckId] = useState("starter_custom");
  const [displayName, setDisplayName] = useState("Starter Custom");
  const [deck, setDeck] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setCards(await ctx.api.cards()); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar cartas."); }
  }
  useEffect(() => { void load(); }, []);

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
    <PageHeader title="Deck Builder" eyebrow="Drag & drop" description="Filtra el catálogo, arrastra (o haz click) en una carta para añadirla. El contador valida reglas antes del PUT /api/v1/decks." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid wide-left">
      <Card>
        <h2>Cartas disponibles</h2>
        <CardFilterGrid cards={cards} onPick={addCard} counts={counts} pickHint="Click o arrastra para añadir al deck" />
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
          <span>También puedes hacer click en una carta para añadirla.</span>
        </DropZone>
        <div className="deck-list compact-scroll">
          {deck.map((cardId, index) => {
            const card = cards.find((item) => item.cardId === cardId);
            return <div key={`${cardId}-${index}`} className="deck-entry"><span>{index + 1}</span><strong>{card?.displayName ?? cardId}</strong><code>{cardId}</code><Button variant="ghost" size="sm" onClick={() => removeAt(index)}>Quitar</Button></div>;
          })}
          {!deck.length ? <EmptyState title="Deck vacío" body="Arrastra o haz click en cartas desde la izquierda." /> : null}
        </div>
        <div className="actions-right"><Button onClick={save} disabled={!isValid || saving}>{saving ? "Guardando..." : "Guardar deck"}</Button></div>
      </Card>
    </div>
  </>;
}
