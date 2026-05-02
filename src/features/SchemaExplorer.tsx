import { useEffect, useMemo, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { Button, Card, EmptyState, Input } from "../components/ui";
import { ApiError } from "../api/http";

export function SchemaExplorer({ ctx }: { ctx: StudioContext }) {
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    try { setSchema(await ctx.api.databaseSchema()); } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar schema docs."); }
  }
  useEffect(() => { void load(); }, []);

  const entries = useMemo(() => Object.entries(schema ?? {}).filter(([key, value]) => `${key} ${JSON.stringify(value)}`.toLowerCase().includes(query.toLowerCase())), [schema, query]);

  return <>
    <PageHeader title="Database Schema Explorer" eyebrow="/api/v1/authoring/database-schema" description="Vista de referencia para entender tablas/columnas del backend sin abrir el proyecto C#." actions={<Button onClick={load}>Refrescar</Button>} />
    <Card>
      <div className="section-heading"><h2>Tablas</h2><Input placeholder="Buscar tabla o columna..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      {entries.length ? <div className="schema-list">{entries.map(([name, data]) => <details key={name} open={entries.length <= 3}><summary>{name}</summary><pre>{JSON.stringify(data, null, 2)}</pre></details>)}</div> : <EmptyState title="Sin schema" body="Refresca o revisa que el backend tenga el endpoint de authoring habilitado." />}
    </Card>
  </>;
}
