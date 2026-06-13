import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Join class names, dropping falsy values. Central helper for conditional classes. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cn("surface", className)}>{children}</section>;
}

export function Button({ children, className = "", variant = "primary", size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft"; size?: "sm" }) {
  return <button className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)} {...props}>{children}</button>;
}

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{help ? <small>{help}</small> : null}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty"><strong>{title}</strong><span>{body}</span></div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong>{hint ? <small>{hint}</small> : null}</div>;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal"><header><h2>{title}</h2><Button variant="ghost" onClick={onClose}>Cerrar</Button></header>{children}</div></div>;
}

/* ============================================================================
   Centralized layout/composition primitives — replace the markup that was
   duplicated across feature pages (section headings, split grids, scrollable
   catalog lists, form grids, effect rows).
   ========================================================================== */

/** Heading row with an optional subtitle and right-aligned actions. */
export function SectionHeading({ title, sub, actions, level = 2 }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; level?: 2 | 3 }) {
  const Title = level === 3 ? "h3" : "h2";
  return (
    <div className="section-heading">
      <div>
        <Title>{title}</Title>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ?? null}
    </div>
  );
}

/** Two-pane responsive split. `wideLeft` widens the left column. */
export function SplitLayout({ children, wideLeft = false }: { children: ReactNode; wideLeft?: boolean }) {
  return <div className={cn("split-grid", wideLeft && "wide-left")}>{children}</div>;
}

/** Form field grid: 1 / 2 / 3 columns. */
export function FormGrid({ children, cols = 2, className = "" }: { children: ReactNode; cols?: 1 | 2 | 3; className?: string }) {
  const colClass = cols === 3 ? "three" : cols === 2 ? "two" : "";
  return <div className={cn("form-grid", colClass, className)}>{children}</div>;
}

/** Scrollable, capped list (catalog / abilities / decks). */
export function ScrollList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("card-list", "compact-scroll", className)}>{children}</div>;
}

/** Selectable catalog entry: title + monospace id + optional subtitle/extra. */
export function CatalogItem({ active = false, onClick, title, code, subtitle, children }: { active?: boolean; onClick?: () => void; title: ReactNode; code?: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <button type="button" className={cn("catalog-card", active && "active")} onClick={onClick}>
      <strong>{title}</strong>
      {code ? <code>{code}</code> : null}
      {subtitle ? <span>{subtitle}</span> : null}
      {children}
    </button>
  );
}

/** A removable row of fields (ability effects, crafting reqs, visual layers). */
export function EffectRow({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <div className="effect-row">
      {children}
      {onRemove ? <Button variant="danger" size="sm" onClick={onRemove}>✕</Button> : null}
    </div>
  );
}
