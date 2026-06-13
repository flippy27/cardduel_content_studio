import { useEffect, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { DragSource, DropZone } from "../components/DropZone";
import { CardFilterGrid } from "../components/CardFilterGrid";
import { Badge, Button, Card, Field, FormGrid, Input, SectionHeading, Select, Textarea } from "../components/ui";
import { ApiError } from "../api/http";
import type { AbilityAuthoringDto, AuthoringLookups, CardDefinitionDto, CreateAbilityRequest, CreateCardRequest } from "../domain/types";
import { ALLOWED_ROWS, CARD_FACTIONS, CARD_RARITIES, CARD_TYPES, DEFAULT_ATTACK_SELECTORS, labelFor, slugify, UNIT_TYPES } from "../domain/constants";

const starterCard: CreateCardRequest = {
  cardId: "",
  displayName: "",
  description: "",
  manaCost: 2,
  attack: 2,
  health: 3,
  armor: 0,
  cardType: 0,
  cardRarity: 0,
  cardFaction: 0,
  unitType: 0,
  allowedRow: 2,
  defaultAttackSelector: 1,
  turnsUntilCanAttack: 1,
  isLimited: false,
  battlePresentation: { attackMotionLevel: 2, attackShakeLevel: 2, attackDeliveryType: "projectile", impactFxId: "", attackAudioCueId: "", metadataJson: "{}" },
  visualProfiles: []
};

export function CardStudio({ ctx }: { ctx: StudioContext }) {
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [abilities, setAbilities] = useState<AbilityAuthoringDto[]>([]);
  const [lookups, setLookups] = useState<AuthoringLookups | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreateCardRequest>(starterCard);
  const [abilityDrafts, setAbilityDrafts] = useState<CreateAbilityRequest[]>([]);
  const [saving, setSaving] = useState(false);
  const selected = cards.find((card) => card.cardId === editingId) ?? null;

  async function load() {
    // Load each resource independently so one failing endpoint (e.g. visual
    // templates 404) doesn't wipe the card catalog.
    const [cardR, abilityR, lookupR] = await Promise.allSettled([ctx.api.cards(), ctx.api.abilities(), ctx.api.lookups()]);
    if (cardR.status === "fulfilled") setCards(cardR.value);
    else ctx.notify("error", cardR.reason instanceof ApiError ? cardR.reason.message : "No pude cargar el catálogo de cartas.");
    if (abilityR.status === "fulfilled") setAbilities(abilityR.value);
    if (lookupR.status === "fulfilled") setLookups(lookupR.value);
  }
  useEffect(() => { void load(); }, []);

  function patch<K extends keyof CreateCardRequest>(key: K, value: CreateCardRequest[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function newCard() {
    setEditingId(null);
    setDraft(starterCard);
    setAbilityDrafts([]);
  }

  function loadForEdit(cardId: string) {
    const c = cards.find((card) => card.cardId === cardId);
    if (!c) return;
    setEditingId(c.cardId);
    setAbilityDrafts([]);
    setDraft({
      cardId: c.cardId, displayName: c.displayName, description: c.description, manaCost: c.manaCost,
      attack: c.attack, health: c.health, armor: c.armor, cardType: c.cardType, cardRarity: c.cardRarity,
      cardFaction: c.cardFaction, unitType: c.unitType ?? 0, allowedRow: c.allowedRow,
      defaultAttackSelector: c.defaultAttackSelector, turnsUntilCanAttack: c.turnsUntilCanAttack,
      isLimited: c.isLimited, battlePresentation: c.battlePresentation ?? starterCard.battlePresentation, visualProfiles: []
    });
  }

  function abilityToCreateRequest(ability: AbilityAuthoringDto): CreateAbilityRequest {
    return {
      abilityId: ability.abilityId, displayName: ability.displayName, description: ability.description,
      skillType: ability.skillType, triggerKind: ability.triggerKind, targetSelectorKind: ability.targetSelectorKind,
      animationCueId: ability.animationCueId, iconAssetRef: ability.iconAssetRef, statusIconAssetRef: ability.statusIconAssetRef,
      vfxCueId: ability.vfxCueId, audioCueId: ability.audioCueId, uiColorHex: ability.uiColorHex, tooltipSummary: ability.tooltipSummary,
      conditionsJson: ability.conditionsJson ?? "{}", metadataJson: ability.metadataJson ?? "{}",
      effects: ability.effects.map((effect, sequence) => ({
        effectKind: effect.effectKind, amount: effect.amount, secondaryAmount: effect.secondaryAmount,
        durationTurns: effect.durationTurns, targetSelectorKindOverride: effect.targetSelectorKindOverride,
        sequence, metadataJson: effect.metadataJson ?? "{}"
      }))
    };
  }

  async function onAbilityDrop(abilityId: string) {
    const ability = abilities.find((item) => item.abilityId === abilityId);
    if (!ability) return;
    if (editingId && selected) {
      // Edit mode: attach directly to the existing card.
      if (!ctx.requireAuth()) return;
      if ((selected.abilities ?? []).some((a) => a.abilityId === abilityId)) return ctx.notify("info", "La carta ya tiene esa ability.");
      if ((selected.abilities ?? []).length >= 3) return ctx.notify("error", "Máximo 3 abilities por carta.");
      try {
        await ctx.api.addCardAbility(selected.cardId, abilityToCreateRequest(ability));
        ctx.notify("success", "Ability asociada.");
        await load();
      } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude asociar la ability."); }
      return;
    }
    // Create mode: stage locally.
    if (abilityDrafts.some((item) => item.abilityId === abilityId)) return ctx.notify("info", "Esa ability ya está en el draft.");
    if (abilityDrafts.length >= 3) return ctx.notify("error", "Máximo 3 abilities por carta.");
    setAbilityDrafts((items) => [...items, abilityToCreateRequest(ability)]);
  }

  async function detachAbility(abilityId: string) {
    if (editingId && selected) {
      if (!ctx.requireAuth()) return;
      try { await ctx.api.removeCardAbility(selected.cardId, abilityId); ctx.notify("success", "Ability quitada."); await load(); }
      catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude quitar la ability."); }
    } else {
      setAbilityDrafts((items) => items.filter((item) => item.abilityId !== abilityId));
    }
  }

  async function saveCard() {
    if (!ctx.requireAuth()) return;
    if (!draft.cardId || !draft.displayName) return ctx.notify("error", "CardId y nombre son obligatorios.");
    setSaving(true);
    const payload = { ...draft, unitType: draft.cardType === 0 ? draft.unitType : null };
    try {
      if (editingId) {
        await ctx.api.updateCard(editingId, payload);
        ctx.notify("success", `Carta ${draft.displayName} actualizada.`);
        await load();
      } else {
        const created = await ctx.api.createCard(payload);
        for (const ability of abilityDrafts) await ctx.api.addCardAbility(created.cardId, ability);
        ctx.notify("success", `Carta ${created.displayName} creada con ${abilityDrafts.length} abilities.`);
        await load();
        loadForEdit(created.cardId);
      }
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude guardar la carta.");
    } finally { setSaving(false); }
  }

  async function deleteCard() {
    if (!editingId || !ctx.requireAuth()) return;
    if (!window.confirm(`Eliminar ${editingId}?`)) return;
    try { await ctx.api.deleteCard(editingId); ctx.notify("success", "Carta eliminada."); newCard(); await load(); }
    catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude eliminar la carta."); }
  }

  const shownAbilities = editingId && selected ? selected.abilities : abilityDrafts;

  return <>
    <PageHeader title="Card Studio" eyebrow="Crear y editar cartas" description="Filtra el catálogo y haz click en una carta para editarla, o crea una nueva. Arrastra abilities reutilizables y aplica templates visuales." actions={<Button onClick={load}>Refrescar</Button>} />

    <Card>
      <SectionHeading title="Catálogo de cartas" sub="Click en una carta para editarla" actions={<Button size="sm" onClick={newCard}>+ Nueva carta</Button>} />
      <CardFilterGrid cards={cards} onPick={loadForEdit} activeId={editingId} pickHint="Click para editar" />
    </Card>

    <div className="split-grid wide-left">
      <Card>
        <SectionHeading title={editingId ? `Editando: ${draft.displayName || editingId}` : "Nueva carta"} actions={editingId ? <Button size="sm" variant="ghost" onClick={newCard}>Cancelar edición</Button> : null} />
        <FormGrid cols={3}>
          <Field label="Nombre"><Input value={draft.displayName} onChange={(e) => patch("displayName", e.target.value)} onBlur={() => !draft.cardId && patch("cardId", slugify(draft.displayName))} /></Field>
          <Field label="Card ID"><Input value={draft.cardId} disabled={!!editingId} onChange={(e) => patch("cardId", slugify(e.target.value))} /></Field>
          <Field label="Facción"><Select value={draft.cardFaction} onChange={(e) => patch("cardFaction", Number(e.target.value))}>{CARD_FACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
          <Field label="Tipo"><Select value={draft.cardType} onChange={(e) => patch("cardType", Number(e.target.value))}>{CARD_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
          <Field label="Rareza"><Select value={draft.cardRarity} onChange={(e) => patch("cardRarity", Number(e.target.value))}>{CARD_RARITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
          <Field label="Unit type"><Select disabled={draft.cardType !== 0} value={draft.unitType ?? ""} onChange={(e) => patch("unitType", e.target.value === "" ? null : Number(e.target.value))}>{UNIT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
          <Field label="Mana"><Input type="number" min={0} max={20} value={draft.manaCost} onChange={(e) => patch("manaCost", Number(e.target.value))} /></Field>
          <Field label="Attack"><Input type="number" min={0} max={20} value={draft.attack} onChange={(e) => patch("attack", Number(e.target.value))} /></Field>
          <Field label="Health"><Input type="number" min={1} max={20} value={draft.health} onChange={(e) => patch("health", Number(e.target.value))} /></Field>
          <Field label="Armor"><Input type="number" min={0} max={10} value={draft.armor} onChange={(e) => patch("armor", Number(e.target.value))} /></Field>
          <Field label="Allowed row"><Select value={draft.allowedRow} onChange={(e) => patch("allowedRow", Number(e.target.value))}>{ALLOWED_ROWS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
          <Field label="Target default"><Select value={draft.defaultAttackSelector} onChange={(e) => patch("defaultAttackSelector", Number(e.target.value))}>{DEFAULT_ATTACK_SELECTORS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
        </FormGrid>
        <Field label="Descripción"><Textarea rows={3} value={draft.description} onChange={(e) => patch("description", e.target.value)} /></Field>
        <Field label="Delivery type"><Input value={draft.battlePresentation?.attackDeliveryType ?? ""} onChange={(e) => patch("battlePresentation", { ...draft.battlePresentation!, attackDeliveryType: e.target.value })} placeholder="projectile / melee / magic" /></Field>
        <DropZone accept="cardduel/ability" onDropValue={onAbilityDrop} className="ability-drop">
          <strong>Arrastra abilities aquí</strong>
          <span>{editingId ? "Se asocian directamente a esta carta (máx 3)." : "0 a 3 abilities; se crean junto con la carta."}</span>
          <div className="attached-list">{shownAbilities.map((ability) => <div key={ability.abilityId} className="attached-item"><span>{ability.displayName}</span><code>{ability.abilityId}</code><Button variant="ghost" size="sm" onClick={() => detachAbility(ability.abilityId)}>Quitar</Button></div>)}</div>
        </DropZone>
        <div className="actions-right">
          {editingId ? <Button variant="danger" onClick={deleteCard}>Eliminar</Button> : null}
          <Button onClick={saveCard} disabled={saving}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear carta"}</Button>
        </div>
      </Card>

      <Card>
        <h2>Preview</h2>
        <CardPreview card={draft} abilities={shownAbilities} />
        {selected ? <div className="pill-row" style={{ marginTop: 8 }}><Badge tone="soft">{labelFor(CARD_TYPES, selected.cardType)}</Badge><Badge tone="soft">{labelFor(CARD_RARITIES, selected.cardRarity)}</Badge><Badge tone="soft">{labelFor(CARD_FACTIONS, selected.cardFaction)}</Badge></div> : null}
        <h3 className="top-gap">Ability tray</h3>
        <div className="ability-list compact-scroll small">
          {abilities.map((ability) => <DragSource key={ability.abilityId} type="cardduel/ability" value={ability.abilityId} className="ability-chip"><strong>{ability.displayName}</strong><small>{ability.effects.length} effects · {lookups?.triggerKinds.find((t) => t.id === ability.triggerKind)?.displayName ?? ability.triggerKind}</small></DragSource>)}
        </div>
      </Card>
    </div>
  </>;
}

function CardPreview({ card, abilities }: { card: Partial<CardDefinitionDto | CreateCardRequest>; abilities: Array<{ abilityId: string; displayName: string; description?: string }> }) {
  const faction = CARD_FACTIONS.find((item) => item.value === card.cardFaction)?.tone ?? "neutral";
  return <div className={`game-card faction-${faction}`}>
    <div className="mana-gem">{card.manaCost ?? 0}</div>
    <div className="art-window"><span>{card.displayName || "Nueva carta"}</span></div>
    <div className="card-body">
      <strong>{card.displayName || "Nombre"}</strong>
      <small>{labelFor(CARD_TYPES, card.cardType)} · {labelFor(CARD_RARITIES, card.cardRarity)}</small>
      <p>{card.description || "Descripción de reglas y sabor de la carta."}</p>
      <div className="ability-lines">{abilities.slice(0, 3).map((ability) => <span key={ability.abilityId}>{ability.displayName}</span>)}</div>
    </div>
    <div className="stat-line"><b>{card.attack ?? 0}</b><b>{card.health ?? 1}</b><b>{card.armor ?? 0}</b></div>
  </div>;
}
