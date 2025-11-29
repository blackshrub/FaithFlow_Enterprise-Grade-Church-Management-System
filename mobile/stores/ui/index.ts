/**
 * UI State Stores Index
 *
 * Centralized exports for all UI state stores.
 * These stores manage temporary UI state only - business logic stays in hooks.
 */

// Events
export { useEventsUIStore, useEventsTab, useEventsCategory, useEventsRefreshing } from './eventsUI';
export type { EventTab, TabDirection, EventsUIState } from './eventsUI';

// Give
export {
  useGiveUIStore,
  useGiveStep,
  useGiveForm,
  useGiveHistory,
} from './giveUI';
export type {
  GiveStep,
  OfferingType,
  HistoryFilter,
  PaymentMethodType,
  GiveUIState,
} from './giveUI';

// Explore
export {
  useExploreUIStore,
  useExploreLanguage,
  useExploreHeader,
  useExploreRefreshing,
} from './exploreUI';
export type { ContentLanguage, ExploreUIState } from './exploreUI';

// Community
export {
  useCommunityUIStore,
  useCommunitySearch,
  useCommunityRefreshing,
} from './communityUI';
export type { CommunityUIState } from './communityUI';

// Profile
export {
  useProfileUIStore,
  useProfileDialog,
  useProfileRefreshing,
} from './profileUI';
export type { ProfileUIState } from './profileUI';
