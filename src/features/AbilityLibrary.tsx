import { useEffect, useMemo, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { DragSource } from "../components/DropZone";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "../components/ui";
import { ApiError } from "../api/http";
import type { AbilityAuthoringDto, AuthoringLookups, CreateAbilityRequest, CreateEffectRequest } from "../domain/types";
import { slugify } from "../domain/constants";

const blankEffect: CreateEffectRequest = { effectKind: 0, amount: 1, sequence: 0, secondaryAmount: null, durationTurns: null, targetSelectorKindOverride: null, metadataJson: "{}" };

export function AbilityLibrary({ ctx }: { ctx: StudioContext }) {
  const [abilities, setAbilities] = useState<AbilityAuthoringDto[]>([]);
  const [lookups, setLookups] = useState<AuthoringLookups | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CreateAbilityRequest>({ abilityId: "", displayName: "", description: "", skillType: 3, triggerKind: 0, targetSelectorKind: 1, effects: [{ ...blankEffect }] });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [abilityResult, lookupResult] = await Promise.all([ctx.api.abilities(), ctx.api.lookups()]);
      setAbilities(abilityResult);
      setLookups(lookupResult);
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar abilities.");
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => abilities.filter((ability) => `${ability.displayName} ${ability.abilityId} ${ability.description}`.toLowerCase().includes(query.toLowerCase())), [abilities, query]);

  function updateEffect(index: number, patch: Partial<CreateEffectRequest>) {
    setDraft((current) => ({ ...current, effects: current.effects.map((effect, i) => i === index ? { ...effect, ...patch, sequence: i } : effect) }));
  }

  function removeEffect(index: number) {
    setDraft((current) => ({ ...current, effects: current.effects.filter((_, i) => i !== index).map((effect, sequence) => ({ ...effect, sequence })) }));
  }

  function loadAsDraft(ability: AbilityAuthoringDto) {
    setDraft({
      abilityId: `${ability.abilityId}_copy`,
      displayName: `${ability.displayName} Copy`,
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
    });
  }

  async function save() {
    if (!ctx.requireAuth()) return;
    if (!draft.abilityId || !draft.displayName) {
      ctx.notify("error", "AbilityId y nombre son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await ctx.api.createAbility({ ...draft, effects: draft.effects.map((effect, sequence) => ({ ...effect, sequence })) });
      ctx.notify("success", "Ability creada correctamente.");
      setDraft({ abilityId: "", displayName: "", description: "", skillType: 3, triggerKind: 0, targetSelectorKind: 1, effects: [{ ...blankEffect }] });
      await load();
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude guardar la ability.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageHeader title="Ability Library" eyebrow="Drag source para cartas" description="Crea abilities reutilizables con effects ordenados. Después puedes arrastrarlas hacia una carta en Card Studio." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid wide-left">
      <Card>
        <div className="section-heading"><div><h2>Biblioteca</h2><p>{abilities.length} abilities reutilizables en el backend.</p></div><Input placeholder="Buscar ability..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="ability-list">
          {filtered.map((ability) => <DragSource key={ability.abilityId} type="cardduel/ability" value={ability.abilityId} className="ability-card">
            <div>
              <strong>{ability.displayName}</strong>
              <code>{ability.abilityId}</code>
            </div>
            <p>{ability.description}</p>
            <div className="pill-row"><Badge tone="soft">skill {ability.skillType}</Badge><Badge tone="soft">trigger {ability.triggerKind}</Badge><Badge tone="soft">{ability.effects.length} effects</Badge></div>
            <Button variant="ghost" onClick={(event) => { event.stopPropagation(); loadAsDraft(ability); }}>Clonar como draft</Button>
          </DragSource>)}
          {!filtered.length ? <EmptyState title="Sin resultados" body="Cambia la búsqueda o crea una nueva ability." /> : null}
        </div>
      </Card>

      <Card>
        <h2>Nueva ability</h2>
        <div className="form-grid two">
          <Field label="Nombre"><Input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value, abilityId: draft.abilityId || slugify(e.target.value) })} /></Field>
          <Field label="Ability ID"><Input value={draft.abilityId} onChange={(e) => setDraft({ ...draft, abilityId: slugify(e.target.value) })} /></Field>
          <Field label="Skill type"><Select value={draft.skillType} onChange={(e) => setDraft({ ...draft, skillType: Number(e.target.value) })}>{(lookups?.skillTypes ?? []).map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</Select></Field>
          <Field label="Trigger"><Select value={draft.triggerKind} onChange={(e) => setDraft({ ...draft, triggerKind: Number(e.target.value) })}>{(lookups?.triggerKinds ?? []).map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</Select></Field>
          <Field label="Target selector"><Select value={draft.targetSelectorKind} onChange={(e) => setDraft({ ...draft, targetSelectorKind: Number(e.target.value) })}>{(lookups?.targetSelectors ?? []).map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</Select></Field>
          <Field label="Icon asset"><Input value={draft.iconAssetRef ?? ""} onChange={(e) => setDraft({ ...draft, iconAssetRef: e.target.value })} placeholder="abilities/my_icon" /></Field>
        </div>
        <Field label="Descripción"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} /></Field>

        <div className="section-heading"><h3>Effects</h3><Button variant="soft" onClick={() => setDraft({ ...draft, effects: [...draft.effects, { ...blankEffect, sequence: draft.effects.length }] })}>+ Effect</Button></div>
        <div className="effect-builder">
          {draft.effects.map((effect, index) => <div className="effect-row" key={index}>
            <Field label="Kind"><Select value={effect.effectKind} onChange={(e) => updateEffect(index, { effectKind: Number(e.target.value) })}>{(lookups?.effectKinds ?? []).map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</Select></Field>
            <Field label="Amount"><Input type="number" min={1} max={100} value={effect.amount} onChange={(e) => updateEffect(index, { amount: Number(e.target.value) })} /></Field>
            <Field label="Duration"><Input type="number" value={effect.durationTurns ?? ""} onChange={(e) => updateEffect(index, { durationTurns: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            <Field label="Target override"><Select value={effect.targetSelectorKindOverride ?? ""} onChange={(e) => updateEffect(index, { targetSelectorKindOverride: e.target.value === "" ? null : Number(e.target.value) })}><option value="">Sin override</option>{(lookups?.targetSelectors ?? []).map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</Select></Field>
            <Button variant="danger" onClick={() => removeEffect(index)} disabled={draft.effects.length <= 1}>Eliminar</Button>
          </div>)}
        </div>
        <div className="actions-right"><Button onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar ability"}</Button></div>
      </Card>
    </div>
  </>;
}
