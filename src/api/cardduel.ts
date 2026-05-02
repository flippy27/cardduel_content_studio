import { ApiClient } from "./http";
import type {
  AbilityAuthoringDto,
  AuthResponse,
  AuthoringLookups,
  CardCraftingInfoDto,
  CardDefinitionDto,
  CardVisualLayerDto,
  CardVisualProfileAssignmentDto,
  CardVisualProfileTemplateDto,
  CreateAbilityRequest,
  CreateCardRequest,
  CreateEffectRequest,
  DeckDetailsDto,
  GameRulesDto,
  GameRulesetSummaryDto,
  ItemTypeDto,
  PlayerInventoryDto
} from "../domain/types";

export function createCardDuelApi(client: ApiClient) {
  return {
    health: () => client.get<{ status?: string } | string>("/api/v1/health"),
    login: (body: { email: string; password: string }) => client.post<AuthResponse>("/api/v1/auth/login", body),
    register: (body: { email: string; username: string; password: string }) => client.post<AuthResponse>("/api/v1/auth/register", body),

    cards: () => client.get<CardDefinitionDto[]>("/api/v1/cards"),
    card: (cardId: string) => client.get<CardDefinitionDto>(`/api/v1/cards/${encodeURIComponent(cardId)}`),
    cardStats: () => client.get<{ totalCards: number; manaCostAvg: number; attackAvg: number; healthAvg: number; cardsWithAbilities: number }>("/api/v1/cards/stats"),
    createCard: (body: CreateCardRequest) => client.post<CardDefinitionDto>("/api/v1/cards", body),
    updateCard: (cardId: string, body: Partial<CreateCardRequest>) => client.put<CardDefinitionDto>(`/api/v1/cards/${encodeURIComponent(cardId)}`, body),
    deleteCard: (cardId: string) => client.delete(`/api/v1/cards/${encodeURIComponent(cardId)}`),
    addCardAbility: (cardId: string, body: CreateAbilityRequest) => client.post<AbilityAuthoringDto>(`/api/v1/cards/${encodeURIComponent(cardId)}/abilities`, body),
    removeCardAbility: (cardId: string, abilityId: string) => client.delete(`/api/v1/cards/${encodeURIComponent(cardId)}/abilities/${encodeURIComponent(abilityId)}`),
    addCardAbilityEffect: (cardId: string, abilityId: string, body: CreateEffectRequest) => client.post(`/api/v1/cards/${encodeURIComponent(cardId)}/abilities/${encodeURIComponent(abilityId)}/effects`, body),

    abilities: () => client.get<AbilityAuthoringDto[]>("/api/v1/abilities"),
    createAbility: (body: CreateAbilityRequest) => client.post<AbilityAuthoringDto>("/api/v1/abilities", body),
    updateAbility: (abilityId: string, body: Partial<CreateAbilityRequest>) => client.put<AbilityAuthoringDto>(`/api/v1/abilities/${encodeURIComponent(abilityId)}`, body),
    deleteAbility: (abilityId: string) => client.delete(`/api/v1/abilities/${encodeURIComponent(abilityId)}`),
    addAbilityEffect: (abilityId: string, body: CreateEffectRequest) => client.post<AbilityAuthoringDto>(`/api/v1/abilities/${encodeURIComponent(abilityId)}/effects`, body),
    updateAbilityPresentation: (abilityId: string, body: Record<string, unknown>) => client.put(`/api/v1/authoring/abilities/${encodeURIComponent(abilityId)}/presentation`, body),

    lookups: () => client.get<AuthoringLookups>("/api/v1/authoring/lookups"),
    visualTemplates: () => client.get<CardVisualProfileTemplateDto[]>("/api/v1/authoring/card-visual-profile-templates"),
    createVisualTemplate: (body: { profileKey: string; displayName: string; description: string; isActive: boolean; layers: CardVisualLayerDto[]; metadataJson?: string }) =>
      client.post<CardVisualProfileTemplateDto>("/api/v1/authoring/card-visual-profile-templates", body),
    assignVisualTemplate: (cardId: string, body: { profileKey: string; isDefault: boolean; overrideDisplayName?: string | null; overrideLayers?: CardVisualLayerDto[] | null; metadataJson?: string | null }) =>
      client.post<CardVisualProfileAssignmentDto[]>(`/api/v1/authoring/cards/${encodeURIComponent(cardId)}/visual-profile-template-assignments`, body),
    cardVisualAssignments: (cardId: string) => client.get<CardVisualProfileAssignmentDto[]>(`/api/v1/authoring/cards/${encodeURIComponent(cardId)}/visual-profile-template-assignments`),
    databaseSchema: () => client.get<Record<string, unknown>>("/api/v1/authoring/database-schema"),

    deckCatalog: () => client.get<CardDefinitionDto[]>("/api/v1/decks/catalog"),
    decks: (playerId: string) => client.get<DeckDetailsDto[]>(`/api/v1/decks/${encodeURIComponent(playerId)}`),
    deck: (playerId: string, deckId: string) => client.get<DeckDetailsDto>(`/api/v1/decks/${encodeURIComponent(playerId)}/${encodeURIComponent(deckId)}`),
    upsertDeck: (body: { playerId: string; deckId: string; displayName: string; cardIds: string[] }) => client.put<void>("/api/v1/decks", body),
    addDeckCard: (playerId: string, deckId: string, body: { cardId: string; position?: number }) => client.post<DeckDetailsDto>(`/api/v1/decks/${encodeURIComponent(playerId)}/${encodeURIComponent(deckId)}/cards`, body),
    removeDeckCard: (playerId: string, deckId: string, entryId: string) => client.delete<DeckDetailsDto>(`/api/v1/decks/${encodeURIComponent(playerId)}/${encodeURIComponent(deckId)}/cards/${encodeURIComponent(entryId)}`),

    items: () => client.get<ItemTypeDto[]>("/api/v1/items"),
    inventory: (userId: string) => client.get<PlayerInventoryDto>(`/api/v1/players/${encodeURIComponent(userId)}/inventory`),
    grantItem: (userId: string, body: { itemTypeKey: string; quantity: number; reason?: string | null }) => client.post(`/api/v1/players/${encodeURIComponent(userId)}/inventory/grant`, body),
    grantPlayerCard: (userId: string, body: { cardId: string; acquiredFrom?: string }) => client.post(`/api/v1/players/${encodeURIComponent(userId)}/cards/grant`, body),

    craftingCards: () => client.get<CardCraftingInfoDto[]>("/api/v1/crafting/cards"),
    setCraftingRequirements: (cardId: string, body: { requirements: Array<{ itemTypeKey: string; quantityRequired: number }> }) =>
      client.put(`/api/v1/crafting/cards/${encodeURIComponent(cardId)}/requirements`, body),
    craftCard: (cardId: string) => client.post(`/api/v1/crafting/cards/${encodeURIComponent(cardId)}`),

    rulesets: () => client.get<GameRulesetSummaryDto[]>("/api/v1/game-rulesets"),
    ruleset: (id: string) => client.get<GameRulesDto>(`/api/v1/game-rulesets/${encodeURIComponent(id)}`),
    createRuleset: (body: Partial<GameRulesDto>) => client.post<GameRulesDto>("/api/v1/game-rulesets", body),
    updateRuleset: (id: string, body: Partial<GameRulesDto>) => client.put<GameRulesDto>(`/api/v1/game-rulesets/${encodeURIComponent(id)}`, body),
    activateRuleset: (id: string) => client.post<GameRulesDto>(`/api/v1/game-rulesets/${encodeURIComponent(id)}/activate`)
  };
}
