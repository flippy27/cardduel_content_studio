import { useEffect, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "../components/ui";
import { ApiError } from "../api/http";
import type { GameRulesDto, GameRulesetSummaryDto } from "../domain/types";
import { slugify } from "../domain/constants";

const defaultRules = {
  rulesetKey: "custom_standard",
  displayName: "Custom Standard",
  description: "Ruleset creado desde Content Studio.",
  isActive: true,
  isDefault: false,
  startingHeroHealth: 30,
  maxHeroHealth: 30,
  startingMana: 1,
  maxMana: 10,
  manaGrantedPerTurn: 1,
  manaGrantTiming: 0,
  initialDrawCount: 4,
  cardsDrawnOnTurnStart: 1,
  startingSeatIndex: 0,
  seatOverrides: []
};

export function RulesetsStudio({ ctx }: { ctx: StudioContext }) {
  const [rulesets, setRulesets] = useState<GameRulesetSummaryDto[]>([]);
  const [selected, setSelected] = useState<GameRulesDto | null>(null);
  const [draft, setDraft] = useState({ ...defaultRules });

  async function load() {
    if (!ctx.auth) return;
    try { setRulesets(await ctx.api.rulesets()); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar rulesets."); }
  }
  useEffect(() => { void load(); }, [ctx.auth?.token]);

  async function select(id: string) {
    try {
      const result = await ctx.api.ruleset(id);
      setSelected(result);
      setDraft({ ...result });
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude abrir ruleset."); }
  }

  async function save() {
    if (!ctx.requireAuth()) return;
    try {
      if (selected?.rulesetId) await ctx.api.updateRuleset(selected.rulesetId, draft);
      else await ctx.api.createRuleset(draft);
      ctx.notify("success", "Ruleset guardado.");
      setSelected(null);
      setDraft({ ...defaultRules });
      await load();
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude guardar ruleset."); }
  }

  async function activate(id: string) {
    if (!ctx.requireAuth()) return;
    try { await ctx.api.activateRuleset(id); ctx.notify("success", "Ruleset activado."); await load(); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude activar ruleset."); }
  }

  return <>
    <PageHeader title="Game Rulesets" eyebrow="Balance global" description="Edita reglas de partida: vida, mana, cartas iniciales, turno inicial y defaults de matchmaking." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid">
      <Card>
        <h2>Rulesets</h2>
        {ctx.auth ? <div className="card-list compact-scroll">{rulesets.map((ruleset) => <button key={ruleset.rulesetId} className={selected?.rulesetId === ruleset.rulesetId ? "catalog-card active" : "catalog-card"} onClick={() => select(ruleset.rulesetId)}>
          <strong>{ruleset.displayName}</strong><code>{ruleset.rulesetKey}</code><span>{ruleset.rulesetId}</span><div className="pill-row">{ruleset.isActive ? <Badge tone="success">active</Badge> : <Badge tone="warning">inactive</Badge>}{ruleset.isDefault ? <Badge tone="soft">default</Badge> : null}</div>
        </button>)}</div> : <EmptyState title="JWT requerido" body="Inicia sesión para consultar rulesets." />}
      </Card>
      <Card>
        <h2>{selected ? "Editar ruleset" : "Nuevo ruleset"}</h2>
        <div className="form-grid three">
          <Field label="Nombre"><Input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value, rulesetKey: draft.rulesetKey || slugify(e.target.value) })} /></Field>
          <Field label="Key"><Input value={draft.rulesetKey} onChange={(e) => setDraft({ ...draft, rulesetKey: slugify(e.target.value) })} /></Field>
          <Field label="Mana timing"><Select value={draft.manaGrantTiming} onChange={(e) => setDraft({ ...draft, manaGrantTiming: Number(e.target.value) })}><option value={0}>Start of turn</option><option value={1}>End of turn</option></Select></Field>
          <Field label="Hero HP"><Input type="number" value={draft.startingHeroHealth} onChange={(e) => setDraft({ ...draft, startingHeroHealth: Number(e.target.value) })} /></Field>
          <Field label="Max HP"><Input type="number" value={draft.maxHeroHealth} onChange={(e) => setDraft({ ...draft, maxHeroHealth: Number(e.target.value) })} /></Field>
          <Field label="Initial draw"><Input type="number" value={draft.initialDrawCount} onChange={(e) => setDraft({ ...draft, initialDrawCount: Number(e.target.value) })} /></Field>
          <Field label="Start mana"><Input type="number" value={draft.startingMana} onChange={(e) => setDraft({ ...draft, startingMana: Number(e.target.value) })} /></Field>
          <Field label="Max mana"><Input type="number" value={draft.maxMana} onChange={(e) => setDraft({ ...draft, maxMana: Number(e.target.value) })} /></Field>
          <Field label="Mana/turn"><Input type="number" value={draft.manaGrantedPerTurn} onChange={(e) => setDraft({ ...draft, manaGrantedPerTurn: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Descripción"><Textarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
        <div className="toolbar"><Button onClick={save}>Guardar ruleset</Button>{selected ? <Button variant="soft" onClick={() => activate(selected.rulesetId)}>Activar</Button> : null}<Button variant="ghost" onClick={() => { setSelected(null); setDraft({ ...defaultRules }); }}>Nuevo</Button></div>
      </Card>
    </div>
  </>;
}
