import { useEffect, useState } from "react";
import type { StudioContext } from "../App";
import type { ViewKey } from "../components/Layout";
import { PageHeader } from "../components/Layout";
import { ApiError } from "../api/http";
import { Button, Card, Stat, Badge, EmptyState } from "../components/ui";
import type { CardDefinitionDto, GameRulesetSummaryDto } from "../domain/types";
import { labelFor, CARD_FACTIONS, CARD_RARITIES, CARD_TYPES } from "../domain/constants";

export function Dashboard({ ctx, setView }: { ctx: StudioContext; setView: (view: ViewKey) => void }) {
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [rulesets, setRulesets] = useState<GameRulesetSummaryDto[]>([]);
  const [stats, setStats] = useState<{ totalCards: number; manaCostAvg: number; attackAvg: number; healthAvg: number; cardsWithAbilities: number } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [cardsResult, statsResult] = await Promise.all([ctx.api.cards(), ctx.api.cardStats()]);
      setCards(cardsResult);
      setStats(statsResult);
      if (ctx.auth) {
        try { setRulesets(await ctx.api.rulesets()); } catch { setRulesets([]); }
      }
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [ctx.auth?.token]);

  const byFaction = groupCount(cards, (card) => labelFor(CARD_FACTIONS, card.cardFaction));
  const byRarity = groupCount(cards, (card) => labelFor(CARD_RARITIES, card.cardRarity));

  return <>
    <PageHeader
      eyebrow="Workbench conectado al backend real"
      title="Panel de creación CardDuel"
      description="Acá tienes una vista rápida del catálogo y accesos directos para crear cartas, abilities, decks, crafting y perfiles visuales sin andar escribiendo JSON a mano."
      actions={<Button onClick={load}>{loading ? "Cargando..." : "Refrescar"}</Button>}
    />
    <div className="stats-grid">
      <Stat label="Cartas" value={stats?.totalCards ?? cards.length} hint="GET /api/v1/cards" />
      <Stat label="Con abilities" value={stats?.cardsWithAbilities ?? cards.filter((card) => card.abilities?.length).length} hint="Relación cards ⇄ abilities" />
      <Stat label="Mana promedio" value={stats ? stats.manaCostAvg.toFixed(1) : "—"} />
      <Stat label="Rulesets" value={rulesets.length || "—"} hint={ctx.auth ? "JWT requerido" : "logueate para verlos"} />
    </div>

    <div className="dashboard-grid">
      <Card>
        <h2>Acciones rápidas</h2>
        <div className="quick-actions">
          <button onClick={() => setView("cards")}>Crear carta con drag & drop <span>Card + abilities + preview</span></button>
          <button onClick={() => setView("abilities")}>Diseñar ability <span>Effects, triggers, targets, metadata</span></button>
          <button onClick={() => setView("decks")}>Armar deck <span>20-30 cartas, máximo 3 copias según backend</span></button>
          <button onClick={() => setView("crafting")}>Configurar crafting <span>Items necesarios por carta</span></button>
        </div>
      </Card>

      <Card>
        <h2>Distribución por facción</h2>
        {cards.length ? <Bars data={byFaction} /> : <EmptyState title="Sin datos" body="Conecta el backend y refresca." />}
      </Card>

      <Card>
        <h2>Distribución por rareza</h2>
        {cards.length ? <Bars data={byRarity} /> : <EmptyState title="Sin datos" body="No hay cartas cargadas aún." />}
      </Card>
    </div>

    <Card>
      <h2>Últimas cartas del catálogo</h2>
      <div className="table-like">
        {cards.slice(0, 12).map((card) => <div key={card.cardId} className="table-row">
          <strong>{card.displayName}</strong>
          <span>{card.cardId}</span>
          <Badge tone="neutral">{labelFor(CARD_TYPES, card.cardType)}</Badge>
          <Badge tone={CARD_FACTIONS.find((f) => f.value === card.cardFaction)?.tone ?? "neutral"}>{labelFor(CARD_FACTIONS, card.cardFaction)}</Badge>
          <Badge tone="soft">{card.abilities?.length ?? 0} abilities</Badge>
        </div>)}
      </div>
    </Card>
  </>;
}

function groupCount<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function Bars({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  return <div className="bars">{Object.entries(data).map(([key, value]) => <div key={key} className="bar-row"><span>{key}</span><div><i style={{ width: `${Math.max(6, value / max * 100)}%` }} /></div><strong>{value}</strong></div>)}</div>;
}
