import { useEffect, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { Badge, Button, Card, CatalogItem, EmptyState, Field, FormGrid, Input, ScrollList, Select, Textarea, Toolbar } from "../components/ui";
import { ApiError } from "../api/http";
import type { GameRulesDto, GameRulesetSummaryDto } from "../domain/types";
import { slugify } from "../domain/constants";

// Editable shape: the server-managed fields (id/timestamps) are dropped and
// description is non-null so the form inputs always get a string.
type RulesetDraft = Omit<GameRulesDto, "rulesetId" | "createdAt" | "updatedAt" | "description"> & { description: string };

const defaultRules: RulesetDraft = {
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
  const [draft, setDraft] = useState<RulesetDraft>({ ...defaultRules });

  async function load() {
    if (!ctx.auth) return;
    try { setRulesets(await ctx.api.rulesets()); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar rulesets."); }
  }
  useEffect(() => { void load(); }, [ctx.auth?.token]);

  async function select(id: string) {
    try {
      const result = await ctx.api.ruleset(id);
      setSelected(result);
      setDraft({ ...result, description: result.description ?? "" });
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
        {ctx.auth ? <ScrollList>{rulesets.map((ruleset) => <CatalogItem key={ruleset.rulesetId} active={selected?.rulesetId === ruleset.rulesetId} onClick={() => select(ruleset.rulesetId)} title={ruleset.displayName} code={ruleset.rulesetKey} subtitle={ruleset.rulesetId}>
          <div className="pill-row">{ruleset.isActive ? <Badge tone="success">active</Badge> : <Badge tone="warning">inactive</Badge>}{ruleset.isDefault ? <Badge tone="soft">default</Badge> : null}</div>
        </CatalogItem>)}</ScrollList> : <EmptyState title="JWT requerido" body="Inicia sesión para consultar rulesets." />}
      </Card>
      <Card>
        <h2>{selected ? "Editar ruleset" : "Nuevo ruleset"}</h2>
        <FormGrid cols={3}>
          <Field label="Nombre"><Input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value, rulesetKey: draft.rulesetKey || slugify(e.target.value) })} /></Field>
          <Field label="Key"><Input value={draft.rulesetKey} onChange={(e) => setDraft({ ...draft, rulesetKey: slugify(e.target.value) })} /></Field>
          <Field label="Mana timing"><Select value={draft.manaGrantTiming} onChange={(e) => setDraft({ ...draft, manaGrantTiming: Number(e.target.value) })}><option value={0}>Start of turn</option><option value={1}>End of turn</option></Select></Field>
          <Field label="Hero HP"><Input type="number" value={draft.startingHeroHealth} onChange={(e) => setDraft({ ...draft, startingHeroHealth: Number(e.target.value) })} /></Field>
          <Field label="Max HP"><Input type="number" value={draft.maxHeroHealth} onChange={(e) => setDraft({ ...draft, maxHeroHealth: Number(e.target.value) })} /></Field>
          <Field label="Initial draw"><Input type="number" value={draft.initialDrawCount} onChange={(e) => setDraft({ ...draft, initialDrawCount: Number(e.target.value) })} /></Field>
          <Field label="Start mana"><Input type="number" value={draft.startingMana} onChange={(e) => setDraft({ ...draft, startingMana: Number(e.target.value) })} /></Field>
          <Field label="Max mana"><Input type="number" value={draft.maxMana} onChange={(e) => setDraft({ ...draft, maxMana: Number(e.target.value) })} /></Field>
          <Field label="Mana/turn"><Input type="number" value={draft.manaGrantedPerTurn} onChange={(e) => setDraft({ ...draft, manaGrantedPerTurn: Number(e.target.value) })} /></Field>
        </FormGrid>
        <Field label="Descripción"><Textarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
        <Toolbar><Button onClick={save}>Guardar ruleset</Button>{selected ? <Button variant="soft" onClick={() => activate(selected.rulesetId)}>Activar</Button> : null}<Button variant="ghost" onClick={() => { setSelected(null); setDraft({ ...defaultRules }); }}>Nuevo</Button></Toolbar>
      </Card>
    </div>
  </>;
}
