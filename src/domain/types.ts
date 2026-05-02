export type ID = string;

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
}

export interface AuthoringLookupDto {
  id: number;
  key: string;
  displayName: string;
  description: string;
  category: string;
  iconAssetRef?: string | null;
  metadataJson?: string | null;
}

export interface EffectKindDefinitionDto extends AuthoringLookupDto {
  producesStatusKind?: number | null;
}

export interface StatusEffectKindDefinitionDto extends AuthoringLookupDto {
  vfxCueId?: string | null;
  uiColorHex?: string | null;
}

export interface AuthoringLookups {
  skillTypes: AuthoringLookupDto[];
  triggerKinds: AuthoringLookupDto[];
  targetSelectors: AuthoringLookupDto[];
  effectKinds: EffectKindDefinitionDto[];
  statusEffectKinds: StatusEffectKindDefinitionDto[];
}

export interface EffectDto {
  id: string;
  effectKind: number;
  amount: number;
  secondaryAmount?: number | null;
  durationTurns?: number | null;
  targetSelectorKindOverride?: number | null;
  sequence: number;
  metadataJson?: string | null;
}

export interface CreateEffectRequest {
  effectKind: number;
  amount: number;
  secondaryAmount?: number | null;
  durationTurns?: number | null;
  targetSelectorKindOverride?: number | null;
  sequence: number;
  metadataJson?: string | null;
}

export interface AbilityDto {
  id: string;
  abilityId: string;
  displayName: string;
  description: string;
  skillType: number;
  triggerKind: number;
  targetSelectorKind: number;
  animationCueId?: string | null;
  conditionsJson?: string | null;
  metadataJson?: string | null;
  effects: EffectDto[];
}

export interface AbilityAuthoringDto extends AbilityDto {
  iconAssetRef?: string | null;
  statusIconAssetRef?: string | null;
  vfxCueId?: string | null;
  audioCueId?: string | null;
  uiColorHex?: string | null;
  tooltipSummary?: string | null;
}

export interface CreateAbilityRequest {
  abilityId: string;
  displayName: string;
  description: string;
  triggerKind: number;
  targetSelectorKind: number;
  effects: CreateEffectRequest[];
  skillType?: number;
  animationCueId?: string | null;
  iconAssetRef?: string | null;
  statusIconAssetRef?: string | null;
  vfxCueId?: string | null;
  audioCueId?: string | null;
  uiColorHex?: string | null;
  tooltipSummary?: string | null;
  conditionsJson?: string | null;
  metadataJson?: string | null;
}

export interface BattlePresentationDto {
  attackMotionLevel: number;
  attackShakeLevel: number;
  attackDeliveryType?: string | null;
  impactFxId?: string | null;
  attackAudioCueId?: string | null;
  metadataJson?: string | null;
}

export interface CardVisualLayerDto {
  surface: string;
  layer: string;
  sourceKind: string;
  assetRef: string;
  sortOrder: number;
  metadataJson?: string | null;
}

export interface CardVisualProfileDto {
  profileKey: string;
  displayName: string;
  isDefault: boolean;
  layers: CardVisualLayerDto[];
}

export interface CardDefinitionDto {
  id: string;
  cardId: string;
  displayName: string;
  description: string;
  manaCost: number;
  attack: number;
  health: number;
  armor: number;
  cardType: number;
  cardRarity: number;
  cardFaction: number;
  unitType?: number | null;
  allowedRow: number;
  defaultAttackSelector: number;
  turnsUntilCanAttack: number;
  isLimited: boolean;
  battlePresentation?: BattlePresentationDto | null;
  visualProfiles: CardVisualProfileDto[];
  abilities: AbilityDto[];
}

export interface CreateCardRequest {
  cardId: string;
  displayName: string;
  description: string;
  manaCost: number;
  attack: number;
  health: number;
  armor: number;
  cardType: number;
  cardRarity: number;
  cardFaction: number;
  unitType?: number | null;
  allowedRow: number;
  defaultAttackSelector: number;
  turnsUntilCanAttack?: number;
  isLimited?: boolean;
  battlePresentation?: BattlePresentationDto | null;
  visualProfiles?: CardVisualProfileDto[] | null;
}

export interface CardVisualProfileTemplateDto {
  id: string;
  profileKey: string;
  displayName: string;
  description: string;
  isActive: boolean;
  layers: CardVisualLayerDto[];
  metadataJson?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CardVisualProfileAssignmentDto {
  id: string;
  cardId: string;
  templateId: string;
  profileKey: string;
  displayName: string;
  isDefault: boolean;
  layers: CardVisualLayerDto[];
  metadataJson?: string | null;
}

export interface DeckCardEntryDto {
  entryId: string;
  cardId: string;
  position: number;
}

export interface DeckDetailsDto {
  playerId: string;
  deckId: string;
  displayName: string;
  cards: DeckCardEntryDto[];
  cardIds: string[];
}

export interface ItemTypeDto {
  id: number;
  key: string;
  displayName: string;
  description: string;
  category: string;
  maxStack: number;
  isActive: boolean;
  iconAssetRef?: string | null;
  metadataJson?: string | null;
}

export interface PlayerItemDto {
  id: string;
  userId: string;
  itemTypeId: number;
  itemTypeKey: string;
  itemTypeDisplayName: string;
  itemTypeCategory: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerInventoryDto {
  userId: string;
  items: PlayerItemDto[];
}

export interface CraftingRequirementDto {
  id: string;
  cardDefinitionId: string;
  itemTypeId: number;
  itemTypeKey: string;
  itemTypeDisplayName: string;
  quantityRequired: number;
}

export interface CardCraftingInfoDto {
  cardId: string;
  displayName: string;
  cardRarity: number;
  isCraftable: boolean;
  requirements: CraftingRequirementDto[];
}

export interface GameRulesetSummaryDto {
  rulesetId: string;
  rulesetKey: string;
  displayName: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface GameRulesDto extends GameRulesetSummaryDto {
  description?: string | null;
  startingHeroHealth: number;
  maxHeroHealth: number;
  startingMana: number;
  maxMana: number;
  manaGrantedPerTurn: number;
  manaGrantTiming: number;
  initialDrawCount: number;
  cardsDrawnOnTurnStart: number;
  startingSeatIndex: number;
  seatOverrides: Array<{
    seatIndex: number;
    additionalHeroHealth: number;
    additionalMaxHeroHealth: number;
    additionalStartingMana: number;
    additionalMaxMana: number;
    additionalManaPerTurn: number;
    additionalCardsDrawnOnTurnStart: number;
  }>;
}

export interface ApiErrorPayload {
  message?: string;
  title?: string;
  errors?: Record<string, string[]>;
}
