/**
 * Centralized Icon Exports
 *
 * This file re-exports only the lucide-react-native icons that are actually used
 * in the FaithFlow mobile app. This enables better tree-shaking in production builds,
 * reducing the bundle size from ~5MB (all 555 icons) to only the ~85 icons we use.
 *
 * USAGE:
 * Instead of: import { Home, Calendar } from 'lucide-react-native';
 * Use: import { Home, Calendar } from '@/components/icons';
 *
 * When adding new icons:
 * 1. Add the export here
 * 2. Import from '@/components/icons' in your component
 */

// A
export { AlertCircle } from 'lucide-react-native';
export { AlertTriangle } from 'lucide-react-native';
export { ArrowDownAZ } from 'lucide-react-native';
export { ArrowLeft } from 'lucide-react-native';
export { ArrowRight } from 'lucide-react-native';

// B
export { BookOpen } from 'lucide-react-native';
export { Bookmark } from 'lucide-react-native';
export { Bot } from 'lucide-react-native';
export { Brain } from 'lucide-react-native';

// C
export { Calendar } from 'lucide-react-native';
export { CalendarDays } from 'lucide-react-native';
export { Check } from 'lucide-react-native';
export { CheckCheck } from 'lucide-react-native';
export { CheckCircle } from 'lucide-react-native';
export { CheckCircle2 } from 'lucide-react-native';
export { ChevronLeft } from 'lucide-react-native';
export { ChevronRight } from 'lucide-react-native';
export { Circle } from 'lucide-react-native';
export { Clock } from 'lucide-react-native';
export { Compass } from 'lucide-react-native';
export { Copy } from 'lucide-react-native';

// D
export { Download } from 'lucide-react-native';

// E
export { ExternalLink } from 'lucide-react-native';
export { Eye } from 'lucide-react-native';

// F
export { FileText } from 'lucide-react-native';
export { Filter } from 'lucide-react-native';
export { Fingerprint } from 'lucide-react-native';
export { Flame } from 'lucide-react-native';

// G
export { Gift } from 'lucide-react-native';

// H
export { HandHeart } from 'lucide-react-native';
export { Heart } from 'lucide-react-native';
export { Highlighter } from 'lucide-react-native';
export { History } from 'lucide-react-native';
export { Home } from 'lucide-react-native';

// I
export { Info } from 'lucide-react-native';

// L
export { Languages } from 'lucide-react-native';
export { LayoutGrid } from 'lucide-react-native';
export { Lightbulb } from 'lucide-react-native';
export { List } from 'lucide-react-native';
export { ListOrdered } from 'lucide-react-native';
export { Lock } from 'lucide-react-native';
export { LogOut } from 'lucide-react-native';

// M
export { MapPin } from 'lucide-react-native';
export { MessageCircle } from 'lucide-react-native';
export { Mic } from 'lucide-react-native';
export { MicOff } from 'lucide-react-native';
export { MoreHorizontal } from 'lucide-react-native';
export { MoreVertical } from 'lucide-react-native';

// P
export { Pause } from 'lucide-react-native';
export { Phone } from 'lucide-react-native';
export { PhoneOff } from 'lucide-react-native';
export { Play } from 'lucide-react-native';
export { Plus } from 'lucide-react-native';

// R
export { RefreshCw } from 'lucide-react-native';

// S
export { Save } from 'lucide-react-native';
export { Scan } from 'lucide-react-native';
export { Search } from 'lucide-react-native';
export { SearchX } from 'lucide-react-native';
export { Send } from 'lucide-react-native';
export { Share2 } from 'lucide-react-native';
export { Shield } from 'lucide-react-native';
export { ShieldCheck } from 'lucide-react-native';
export { SmilePlus } from 'lucide-react-native';
export { Sparkles } from 'lucide-react-native';
export { Star } from 'lucide-react-native';

// T
export { Target } from 'lucide-react-native';
export { Timer } from 'lucide-react-native';
export { Trash2 } from 'lucide-react-native';
export { TrendingUp } from 'lucide-react-native';
export { Trophy } from 'lucide-react-native';
export { Type } from 'lucide-react-native';

// U
export { User } from 'lucide-react-native';
export { Users } from 'lucide-react-native';

// V
export { Video } from 'lucide-react-native';
export { Volume2 } from 'lucide-react-native';
export { VolumeX } from 'lucide-react-native';

// W
export { Wifi } from 'lucide-react-native';
export { WifiOff } from 'lucide-react-native';

// X
export { X } from 'lucide-react-native';
export { XCircle } from 'lucide-react-native';

// Z
export { Zap } from 'lucide-react-native';

// Type exports
export type { LucideProps, LucideIcon } from 'lucide-react-native';

/**
 * Icon count: ~85 icons (vs 555 in full library)
 * Estimated bundle savings: ~4MB when tree-shaking is enabled
 *
 * To add a new icon:
 * 1. Check if it's already exported here
 * 2. If not, add: export { IconName } from 'lucide-react-native';
 * 3. Import in your component: import { IconName } from '@/components/icons';
 */
