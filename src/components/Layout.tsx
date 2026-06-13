import { Activity, Boxes, Database, Hammer, Library, LogOut, PackagePlus, ScrollText, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { AuthResponse } from "../domain/types";
import { Button } from "./ui";

export type ViewKey = "dashboard" | "cards" | "abilities" | "decks" | "crafting" | "visuals" | "inventory" | "rulesets" | "schema";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: Activity },
  { key: "cards", label: "Card Studio", icon: Sparkles },
  { key: "abilities", label: "Abilities", icon: ShieldCheck },
  { key: "decks", label: "Deck Builder", icon: Boxes },
  { key: "crafting", label: "Crafting", icon: Hammer },
  { key: "inventory", label: "Inventory", icon: PackagePlus },
  { key: "rulesets", label: "Rulesets", icon: ScrollText },
  { key: "schema", label: "Schema", icon: Database }
] as const;

export function Layout({ view, setView, auth, onLogout, children }: { view: ViewKey; setView: (view: ViewKey) => void; auth?: AuthResponse | null; onLogout: () => void; children: ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><Library size={28}/><div><strong>CardDuel</strong><span>Content Studio</span></div></div>
      <nav>{nav.map(({ key, label, icon: Icon }) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key as ViewKey)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="session-card">
        <span>Sesión</span>
        {auth ? <><strong>{auth.username}</strong><small>{auth.email}</small><Button variant="ghost" onClick={onLogout}><LogOut size={16}/> Salir</Button></> : <small>No logueado. Puedes leer catálogo, pero para guardar necesitas JWT.</small>}
      </div>
    </aside>
    <main className="main-content">{children}</main>
  </div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1>{title}</h1><p>{description}</p></div>{actions ? <div className="page-actions">{actions}</div> : null}</header>;
}
