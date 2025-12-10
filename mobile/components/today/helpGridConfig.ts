/**
 * Help Grid Configuration
 *
 * Defines the action items for the "How Can We Help" grid.
 * Each action has:
 * - Visibility conditions based on member profile
 * - Icon and gradient colors
 * - Navigation route
 * - i18n translation keys
 */

import {
  Heart,
  Users,
  HandHeart,
  MessageCircle,
  CalendarPlus,
  Sparkles,
  Droplets,
  Baby,
  Gem,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export type ActionCondition =
  | 'always'
  | 'hasEvents'
  | 'notBaptized'
  | 'married'
  | 'notMarried';

export interface HelpGridAction {
  id: string;
  icon: LucideIcon;
  /** Translation key for label */
  labelKey: string;
  /** Fallback label if translation not available */
  fallbackLabel: string;
  /** Gradient colors [start, end] */
  gradientColors: [string, string];
  /** Navigation route */
  route: string;
  /** Condition for showing this action */
  condition: ActionCondition;
  /** Priority for ordering (lower = first) */
  priority: number;
}

/**
 * All possible help grid actions
 * Actions are shown/hidden based on member profile and church settings
 */
export const HELP_GRID_ACTIONS: HelpGridAction[] = [
  // Row 1: Always visible
  {
    id: 'prayer',
    icon: Heart,
    labelKey: 'today.help.prayer',
    fallbackLabel: 'Prayer\nRequest',
    gradientColors: ['#EC4899', '#F472B6'], // Pink
    route: '/prayer/submit',
    condition: 'always',
    priority: 1,
  },
  {
    id: 'community',
    icon: Users,
    labelKey: 'today.help.community',
    fallbackLabel: 'Join\nCommunity',
    gradientColors: ['#3B82F6', '#60A5FA'], // Blue
    route: '/(tabs)/groups',
    condition: 'always',
    priority: 2,
  },
  {
    id: 'give',
    icon: HandHeart,
    labelKey: 'today.help.give',
    fallbackLabel: 'Give\nOffering',
    gradientColors: ['#C9A962', '#E8D5A8'], // Gold
    route: '/(tabs)/give',
    condition: 'always',
    priority: 3,
  },
  {
    id: 'counseling',
    icon: MessageCircle,
    labelKey: 'today.help.counseling',
    fallbackLabel: 'Talk to\nSomeone',
    gradientColors: ['#8B5CF6', '#A78BFA'], // Purple
    route: '/requests/counseling',
    condition: 'always',
    priority: 4,
  },

  // Row 2+: Conditional
  {
    id: 'registerEvent',
    icon: CalendarPlus,
    labelKey: 'today.help.registerEvent',
    fallbackLabel: 'Register\nfor Event',
    gradientColors: ['#22C55E', '#4ADE80'], // Green
    route: '/(tabs)/events',
    condition: 'hasEvents',
    priority: 5,
  },
  {
    id: 'acceptJesus',
    icon: Sparkles,
    labelKey: 'today.help.acceptJesus',
    fallbackLabel: 'Start Your\nJourney',
    gradientColors: ['#F59E0B', '#FBBF24'], // Amber
    route: '/requests/salvation',
    condition: 'notBaptized',
    priority: 6,
  },
  {
    id: 'baptism',
    icon: Droplets,
    labelKey: 'today.help.baptism',
    fallbackLabel: 'Ready for\nBaptism?',
    gradientColors: ['#06B6D4', '#22D3EE'], // Cyan
    route: '/requests/baptism',
    condition: 'notBaptized',
    priority: 7,
  },
  {
    id: 'childDedication',
    icon: Baby,
    labelKey: 'today.help.childDedication',
    fallbackLabel: 'Dedicate\nYour Child',
    gradientColors: ['#FDA4AF', '#FECDD3'], // Light Pink
    route: '/requests/child-dedication',
    condition: 'married',
    priority: 8,
  },
  {
    id: 'matrimony',
    icon: Gem,
    labelKey: 'today.help.matrimony',
    fallbackLabel: 'Plan Your\nWedding',
    gradientColors: ['#7C3AED', '#A78BFA'], // Violet
    route: '/requests/holy-matrimony',
    condition: 'notMarried',
    priority: 9,
  },
];

/**
 * Get visible actions based on member profile and data
 */
export interface HelpGridContext {
  /** Whether member has been baptized */
  isBaptized: boolean;
  /** Member's marital status */
  maritalStatus: string | null;
  /** Whether there are upcoming events */
  hasUpcomingEvents: boolean;
  /** Force show all items regardless of conditions */
  showAll?: boolean;
}

export function getVisibleActions(context: HelpGridContext): HelpGridAction[] {
  // If showAll is true, return all actions sorted by priority
  if (context.showAll) {
    return [...HELP_GRID_ACTIONS].sort((a, b) => a.priority - b.priority);
  }

  return HELP_GRID_ACTIONS.filter((action) => {
    switch (action.condition) {
      case 'always':
        return true;
      case 'hasEvents':
        return context.hasUpcomingEvents;
      case 'notBaptized':
        return !context.isBaptized;
      case 'married':
        return context.maritalStatus === 'Married';
      case 'notMarried':
        return context.maritalStatus !== 'Married';
      default:
        return true;
    }
  }).sort((a, b) => a.priority - b.priority);
}

/**
 * Get ALL actions without any filtering (for "show all" mode)
 */
export function getAllActions(): HelpGridAction[] {
  return [...HELP_GRID_ACTIONS].sort((a, b) => a.priority - b.priority);
}
