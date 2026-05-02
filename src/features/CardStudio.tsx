import { useEffect, useMemo, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { DragSource, DropZone } from "../components/DropZone";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "../components/ui";
import { ApiError } from "../api/http";
import type { AbilityAuthoringDto, AuthoringLookups, CardDefinitionDto, CardVisualProfileTemplateDto, CreateAbilityRequest, CreateCardRequest } from "../domain/types";
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
  const [templates, setTemplates] = useState<CardVisualProfileTemplateDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreateCardRequest>(starterCard);
  const [abilityDrafts, setAbilityDrafts] = useState<CreateAbilityRequest[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = cards.find((card) => card.cardId === selectedId) ?? null;

  async function load() {
    try {
      const [cardResult, abilityResult, lookupResult, templateResult] = await Promise.all([ctx.api.cards(), ctx.api.abilities(), ctx.api.lookups(), ctx.api.visualTemplates()]);
      setCards(cardResult);
      setAbilities(abilityResult);
      setLookups(lookupResult);
      setTemplates(templateResult);
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar Card Studio.");
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredCards = useMemo(() => cards.filter((card) => `${card.displayName} ${card.cardId}`.toLowerCase().includes(query.toLowerCase())), [cards, query]);

  function patch<K extends keyof CreateCardRequest>(key: K, value: CreateCardRequest[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function abilityToCreateRequest(ability: AbilityAuthoringDto): CreateAbilityRequest {
    return {
      abilityId: ability.abilityId,
      displayName: ability.displayName,
      description: ability.description,
      skillType: ability.skillType,
      triggerKind: ability.triggerKind,
      targetSelectorKind: ability.targetSelectorKind,
      animationCueId: ability.animationCueId,
      iconAssetRef: ability.iconAssetRef,
      statusIconAssetRef: ability.statusIconAssetRef,
      vfxCueId: ability.vfxCueId,
      audioCueId: ability.audioCueId,
      uiColorHex: ability.uiColorHex,
      tooltipSummary: ability.tooltipSummary,
      conditionsJson: ability.conditionsJson ?? "{}",
      metadataJson: ability.metadataJson ?? "{}",
      effects: ability.effects.map((effect, sequence) => ({
        effectKind: effect.effectKind,
        amount: effect.amount,
        secondaryAmount: effect.secondaryAmount,
        durationTurns: effect.durationTurns,
        targetSelectorKindOverride: effect.targetSelectorKindOverride,
        sequence,
        metadataJson: effect.metadataJson ?? "{}"
      }))
    };
  }

  function dropAbility(abilityId: string) {
    const ability = abilities.find((item) => item.abilityId === abilityId);
    if (!ability) return;
    if (abilityDrafts.some((item) => item.abilityId === abilityId)) {
      ctx.notify("info", "Esa ability ya está en el draft.");
      return;
    }
    if (abilityDrafts.length >= 3) {
      ctx.notify("error", "La regla pedida es máximo 3 abilities por carta.");
      return;
    }
    setAbilityDrafts((items) => [...items, abilityToCreateRequest(ability)]);
  }

  function removeAbility(abilityId: string) {
    setAbilityDrafts((items) => items.filter((item) => item.abilityId !== abilityId));
  }

  function addTemplate(profileKey: string) {
    const template = templates.find((item) => item.profileKey === profileKey);
    if (!template) return;
    const exists = draft.visualProfiles?.some((profile) => profile.profileKey === template.profileKey);
    if (exists) return;
    patch("visualProfiles", [...(draft.visualProfiles ?? []), { profileKey: template.profileKey, displayName: template.displayName, isDefault: !(draft.visualProfiles?.length), layers: template.layers }]);
  }

  async function saveCard() {
    if (!ctx.requireAuth()) return;
    if (!draft.cardId || !draft.displayName) {
      ctx.notify("error", "CardId y nombre son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const created = await ctx.api.createCard({ ...draft, unitType: draft.cardType === 0 ? draft.unitType : null });
      for (const ability of abilityDrafts) {
        await ctx.api.addCardAbility(created.cardId, ability);
      }
      ctx.notify("success", `Carta ${created.displayName} creada con ${abilityDrafts.length} abilities.`);
      setDraft(starterCard);
      setAbilityDrafts([]);
      await load();
      setSelectedId(created.cardId);
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude crear la carta.");
    } finally {
      setSaving(false);
    }
  }

  async function attachToSelected(abilityId: string) {
    if (!selected || !ctx.requireAuth()) return;
    const ability = abilities.find((item) => item.abilityId === abilityId);
    if (!ability) return;
    if ((selected.abilities ?? []).some((item) => item.abilityId === ability.abilityId)) {
      ctx.notify("info", "La carta ya tiene esa ability.");
      return;
    }
    if ((selected.abilities ?? []).length >= 3) {
      ctx.notify("error", "Máximo 3 abilities por carta.");
      return;
    }
    try {
      await ctx.api.addCardAbility(selected.cardId, abilityToCreateRequest(ability));
      ctx.notify("success", "Ability asociada a la carta.");
      await load();
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude asociar la ability.");
    }
  }

  async function deleteCard(cardId: string) {
    if (!ctx.requireAuth()) return;
    if (!window.confirm(`Eliminar ${cardId}?`)) return;
    try {
      await ctx.api.deleteCard(cardId);
      ctx.notify("success", "Carta eliminada.");
      if (selectedId === cardId) setSelectedId(null);
      await load();
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude eliminar la carta.");
    }
  }

  return <>
    <PageHeader title="Card Studio" eyebrow="Carta + abilities + visual profiles" description="Crea cartas de forma visual: defines stats, arrastras abilities reutilizables, aplicas templates visuales y mandas todo al backend en el orden correcto." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="studio-grid">
      <Card className="library-panel">
        <div className="section-heading"><h2>Catálogo</h2><Input placeholder="Buscar carta..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="card-list compact-scroll">
          {filteredCards.map((card) => <button key={card.cardId} className={selectedId === card.cardId ? "catalog-card active" : "catalog-card"} onClick={() => setSelectedId(card.cardId)}>
            <strong>{card.displayName}</strong><code>{card.cardId}</code>
            <span>{labelFor(CARD_TYPES, card.cardType)} · {labelFor(CARD_RARITIES, card.cardRarity)} · {card.abilities.length} abilities</span>
          </button>)}
        </div>
      </Card>

      <Card className="builder-panel">
        <h2>Nueva carta</h2>
        <div className="form-grid three">
          <Field label="Nombre"><Input value={draft.displayName} onChange={(e) => patch("displayName", e.target.value)} onBlur={() => !draft.cardId && patch("cardId", slugify(draft.displayName))} /></Field>
          <Field label="Card ID"><Input value={draft.cardId} onChange={(e) => patch("cardId", slugify(e.target.value))} /></Field>
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
        </div>
        <Field label="Descripción"><Textarea rows={3} value={draft.description} onChange={(e) => patch("description", e.target.value)} /></Field>
        <div className="form-grid two">
          <Field label="Visual template"><Select value="" onChange={(e) => addTemplate(e.target.value)}><option value="">Agregar template...</option>{templates.map((template) => <option key={template.profileKey} value={template.profileKey}>{template.displayName}</option>)}</Select></Field>
          <Field label="Delivery type"><Input value={draft.battlePresentation?.attackDeliveryType ?? ""} onChange={(e) => patch("battlePresentation", { ...draft.battlePresentation!, attackDeliveryType: e.target.value })} placeholder="projectile / melee / magic" /></Field>
        </div>
        <DropZone accept="cardduel/ability" onDropValue={dropAbility} className="ability-drop">
          <strong>Arrastra abilities aquí</strong>
          <span>0 a 3 abilities por carta. Si la ability ya existe, el backend la reutiliza y solo crea la relación.</span>
          <div className="attached-list">{abilityDrafts.map((ability) => <div key={ability.abilityId} className="attached-item"><span>{ability.displayName}</span><code>{ability.abilityId}</code><Button variant="ghost" onClick={() => removeAbility(ability.abilityId)}>Quitar</Button></div>)}</div>
        </DropZone>
        <div className="actions-right"><Button onClick={saveCard} disabled={saving}>{saving ? "Creando..." : "Crear carta completa"}</Button></div>
      </Card>

      <Card className="preview-panel">
        <h2>Preview</h2>
        <CardPreview card={draft} abilities={abilityDrafts} />
        <h3>Ability tray</h3>
        <div className="ability-list compact-scroll small">
          {abilities.map((ability) => <DragSource key={ability.abilityId} type="cardduel/ability" value={ability.abilityId} className="ability-chip"><strong>{ability.displayName}</strong><small>{ability.effects.length} effects · {lookups?.triggerKinds.find((t) => t.id === ability.triggerKind)?.displayName ?? ability.triggerKind}</small></DragSource>)}
        </div>
      </Card>

      <Card className="selected-panel">
        <h2>Carta seleccionada</h2>
        {selected ? <>
          <div className="selected-card-detail">
            <CardPreview card={selected} abilities={selected.abilities} />
            <div>
              <h3>{selected.displayName}</h3>
              <p>{selected.description || "Sin descripción."}</p>
              <div className="pill-row"><Badge tone="soft">{labelFor(CARD_TYPES, selected.cardType)}</Badge><Badge tone="soft">{labelFor(CARD_RARITIES, selected.cardRarity)}</Badge><Badge tone="soft">{labelFor(CARD_FACTIONS, selected.cardFaction)}</Badge></div>
              <DropZone accept="cardduel/ability" onDropValue={attachToSelected} className="mini-drop">Arrastra aquí para anexar ability a esta carta</DropZone>
              <div className="attached-list">{selected.abilities.map((ability) => <div key={ability.abilityId} className="attached-item"><span>{ability.displayName}</span><code>{ability.abilityId}</code></div>)}</div>
              <Button variant="danger" onClick={() => deleteCard(selected.cardId)}>Eliminar carta</Button>
            </div>
          </div>
        </> : <EmptyState title="Nada seleccionado" body="Elige una carta del catálogo para inspeccionarla o anexarle abilities." />}
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
