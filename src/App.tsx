import { useMemo, useState } from "react";
import { ApiClient, ApiError } from "./api/http";
import { createCardDuelApi } from "./api/cardduel";
import { Layout, type ViewKey } from "./components/Layout";
import { Card, Button, Field, Input, Badge } from "./components/ui";
import { useLocalStorage } from "./lib/storage";
import type { AuthResponse } from "./domain/types";
import { Dashboard } from "./features/Dashboard";
import { CardStudio } from "./features/CardStudio";
import { AbilityLibrary } from "./features/AbilityLibrary";
import { DeckBuilder } from "./features/DeckBuilder";
import { CraftingStudio } from "./features/CraftingStudio";
import { VisualProfileStudio } from "./features/VisualProfileStudio";
import { InventoryStudio } from "./features/InventoryStudio";
import { RulesetsStudio } from "./features/RulesetsStudio";
import { SchemaExplorer } from "./features/SchemaExplorer";

export type Toast = { id: string; kind: "success" | "error" | "info"; message: string };
export type StudioContext = {
  api: ReturnType<typeof createCardDuelApi>;
  auth: AuthResponse | null;
  requireAuth: () => boolean;
  notify: (kind: Toast["kind"], message: string) => void;
};

const defaultApiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function App() {
  const [view, setView] = useLocalStorage<ViewKey>("cardduel.view", "dashboard");
  const [apiUrl, setApiUrl] = useLocalStorage("cardduel.apiUrl", defaultApiUrl);
  const [auth, setAuth] = useLocalStorage<AuthResponse | null>("cardduel.auth", null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const client = useMemo(() => new ApiClient({ baseUrl: apiUrl, token: auth?.token, correlationId: `studio-${Date.now()}` }), [apiUrl, auth?.token]);
  const api = useMemo(() => createCardDuelApi(client), [client]);

  function notify(kind: Toast["kind"], message: string) {
    // crypto.randomUUID is unavailable on plain HTTP (non-secure context), so
    // use a context-independent id to avoid crashing every toast on the LAN.
    const toast = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, message };
    setToasts((items) => [...items, toast]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 4500);
  }

  function requireAuth() {
    if (!auth?.token) {
      notify("error", "Necesitas iniciar sesión para guardar cambios en el backend.");
      return false;
    }
    return true;
  }

  const ctx: StudioContext = { api, auth, requireAuth, notify };

  return <>
    <Layout view={view} setView={setView} auth={auth} onLogout={() => setAuth(null)}>
      <ConnectionBar apiUrl={apiUrl} setApiUrl={setApiUrl} auth={auth} setAuth={setAuth} ctx={ctx} />
      {view === "dashboard" && <Dashboard ctx={ctx} setView={setView} />}
      {view === "cards" && <CardStudio ctx={ctx} />}
      {view === "abilities" && <AbilityLibrary ctx={ctx} />}
      {view === "decks" && <DeckBuilder ctx={ctx} />}
      {view === "crafting" && <CraftingStudio ctx={ctx} />}
      {view === "visuals" && <VisualProfileStudio ctx={ctx} />}
      {view === "inventory" && <InventoryStudio ctx={ctx} />}
      {view === "rulesets" && <RulesetsStudio ctx={ctx} />}
      {view === "schema" && <SchemaExplorer ctx={ctx} />}
    </Layout>
    <div className="toast-stack">{toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.kind}`}>{toast.message}</div>)}</div>
  </>;
}

function ConnectionBar({ apiUrl, setApiUrl, auth, setAuth, ctx }: { apiUrl: string; setApiUrl: (url: string) => void; auth: AuthResponse | null; setAuth: (auth: AuthResponse | null) => void; ctx: StudioContext }) {
  // Prefilled seeded credentials so login is one click on the LAN admin.
  const [email, setEmail] = useState("playerone@flippy.com");
  const [username, setUsername] = useState("PlayerOne");
  const [password, setPassword] = useState("123456");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const result = mode === "login" ? await ctx.api.login({ email, password }) : await ctx.api.register({ email, username, password });
      setAuth(result);
      ctx.notify("success", `Listo, sesión iniciada como ${result.username}.`);
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude autenticar contra el backend.");
    } finally {
      setLoading(false);
    }
  }

  async function ping() {
    try {
      await ctx.api.health();
      ctx.notify("success", "Backend respondió correctamente.");
    } catch (error) {
      ctx.notify("error", error instanceof ApiError ? error.message : "No pude conectar al backend.");
    }
  }

  return <Card className="connection-bar">
    <div className="connection-grid">
      <Field label="Backend URL"><Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="http://localhost:5000" /></Field>
      <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      {mode === "register" ? <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} /></Field> : null}
      <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
    </div>
    <div className="connection-actions">
      <Button variant="soft" onClick={ping}>Probar conexión</Button>
      <Button variant="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Cambiar a registro" : "Cambiar a login"}</Button>
      <Button onClick={submit} disabled={loading}>{loading ? "Conectando..." : mode === "login" ? "Login" : "Registrar"}</Button>
      {auth ? <Badge tone="success">JWT activo · {auth.userId.slice(0, 8)}</Badge> : <Badge tone="warning">Solo lectura</Badge>}
    </div>
  </Card>;
}
