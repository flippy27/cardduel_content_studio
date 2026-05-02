import { useEffect, useState } from "react";
import type { StudioContext } from "../App";
import { PageHeader } from "../components/Layout";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "../components/ui";
import { ApiError } from "../api/http";
import type { CardDefinitionDto, CardVisualLayerDto, CardVisualProfileTemplateDto } from "../domain/types";
import { slugify } from "../domain/constants";

const blankLayer: CardVisualLayerDto = { surface: "hand", layer: "frame", sourceKind: "sprite", assetRef: "card/frame/common_metal", sortOrder: 0, metadataJson: "{}" };

export function VisualProfileStudio({ ctx }: { ctx: StudioContext }) {
  const [templates, setTemplates] = useState<CardVisualProfileTemplateDto[]>([]);
  const [cards, setCards] = useState<CardDefinitionDto[]>([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [draft, setDraft] = useState({ profileKey: "", displayName: "", description: "", isActive: true, layers: [{ ...blankLayer }], metadataJson: "{}" });

  async function load() {
    try {
      const [templateResult, cardResult] = await Promise.all([ctx.api.visualTemplates(), ctx.api.cards()]);
      setTemplates(templateResult);
      setCards(cardResult);
      if (!selectedTemplate && templateResult[0]) setSelectedTemplate(templateResult[0].profileKey);
      if (!selectedCard && cardResult[0]) setSelectedCard(cardResult[0].cardId);
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude cargar perfiles visuales."); }
  }
  useEffect(() => { void load(); }, []);

  function updateLayer(index: number, patch: Partial<CardVisualLayerDto>) {
    setDraft((current) => ({ ...current, layers: current.layers.map((layer, i) => i === index ? { ...layer, ...patch } : layer) }));
  }

  async function createTemplate() {
    if (!ctx.requireAuth()) return;
    try {
      await ctx.api.createVisualTemplate(draft);
      ctx.notify("success", "Template visual creado.");
      setDraft({ profileKey: "", displayName: "", description: "", isActive: true, layers: [{ ...blankLayer }], metadataJson: "{}" });
      await load();
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude crear template visual."); }
  }

  async function assignTemplate() {
    if (!ctx.requireAuth()) return;
    try {
      await ctx.api.assignVisualTemplate(selectedCard, { profileKey: selectedTemplate, isDefault: true, metadataJson: "{}" });
      ctx.notify("success", "Template asignado como default a la carta.");
      await load();
    } catch (error) { ctx.notify("error", error instanceof ApiError ? error.message : "No pude asignar template."); }
  }

  return <>
    <PageHeader title="Visual Profile Studio" eyebrow="card_visual_profile_templates" description="Crea templates de composición visual y asígnalos a cartas. Mapea directo a /api/v1/authoring/card-visual-profile-templates." actions={<Button onClick={load}>Refrescar</Button>} />
    <div className="split-grid">
      <Card>
        <h2>Templates existentes</h2>
        <div className="card-list compact-scroll">
          {templates.map((template) => <button key={template.profileKey} className={selectedTemplate === template.profileKey ? "catalog-card active" : "catalog-card"} onClick={() => setSelectedTemplate(template.profileKey)}>
            <strong>{template.displayName}</strong><code>{template.profileKey}</code><span>{template.layers.length} layers</span>{template.isActive ? <Badge tone="success">active</Badge> : <Badge tone="warning">inactive</Badge>}
          </button>)}
        </div>
        <div className="form-grid two top-gap">
          <Field label="Carta"><Select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)}>{cards.map((card) => <option key={card.cardId} value={card.cardId}>{card.displayName}</option>)}</Select></Field>
          <Field label="Template"><Select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>{templates.map((template) => <option key={template.profileKey} value={template.profileKey}>{template.displayName}</option>)}</Select></Field>
        </div>
        <Button onClick={assignTemplate}>Asignar como default</Button>
      </Card>
      <Card>
        <h2>Nuevo template visual</h2>
        <div className="form-grid two">
          <Field label="Display name"><Input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value, profileKey: draft.profileKey || slugify(e.target.value) })} /></Field>
          <Field label="Profile key"><Input value={draft.profileKey} onChange={(e) => setDraft({ ...draft, profileKey: slugify(e.target.value) })} /></Field>
        </div>
        <Field label="Descripción"><Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
        <div className="section-heading"><h3>Layers</h3><Button variant="soft" onClick={() => setDraft((current) => ({ ...current, layers: [...current.layers, { ...blankLayer, sortOrder: current.layers.length * 10 }] }))}>+ Layer</Button></div>
        {draft.layers.map((layer, index) => <div key={index} className="effect-row">
          <Field label="Surface"><Input value={layer.surface} onChange={(e) => updateLayer(index, { surface: e.target.value })} /></Field>
          <Field label="Layer"><Input value={layer.layer} onChange={(e) => updateLayer(index, { layer: e.target.value })} /></Field>
          <Field label="Source"><Select value={layer.sourceKind} onChange={(e) => updateLayer(index, { sourceKind: e.target.value })}><option>sprite</option><option>image</option><option>material</option></Select></Field>
          <Field label="Asset ref"><Input value={layer.assetRef} onChange={(e) => updateLayer(index, { assetRef: e.target.value })} /></Field>
          <Field label="Sort"><Input type="number" value={layer.sortOrder} onChange={(e) => updateLayer(index, { sortOrder: Number(e.target.value) })} /></Field>
          <Button variant="danger" onClick={() => setDraft((current) => ({ ...current, layers: current.layers.filter((_, i) => i !== index) }))}>Eliminar</Button>
        </div>)}
        <div className="actions-right"><Button onClick={createTemplate}>Crear template</Button></div>
      </Card>
    </div>
  </>;
}
