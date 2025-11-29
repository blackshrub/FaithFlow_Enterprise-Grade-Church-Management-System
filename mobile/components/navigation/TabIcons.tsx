/**
 * Custom Tab Bar Icons with Selective Fill Control
 *
 * New Navigation Design Icons:
 * - Today: Sunrise icon (sun rising over horizon)
 * - Events: Calendar icon (bottom filled when active)
 * - Community: Message circle (chat bubble)
 * - Give: Heart with hands (HeartHandshake)
 * - Profile: User icon
 *
 * Legacy icons kept for backward compatibility:
 * - Home, Bible, Heart, Compass
 */

import React from 'react';
import Svg, { Path, Rect, Circle, Line, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  isActive?: boolean;
}

export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Simple house outline - cleaner design */}
    <Path
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Simple door cutout - only visible when active */}
    {isActive && (
      <Path
        d="M9 22V16C9 15.4477 9.44772 15 10 15H14C14.5523 15 15 15.4477 15 16V22"
        fill="white"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

export const BibleIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Closed Bible book with cross on cover */}
    {/* Book outline */}
    <Path
      d="M4 4H20C20.5304 4 21.0391 4.21071 21.4142 4.58579C21.7893 4.96086 22 5.46957 22 6V18C22 18.5304 21.7893 19.0391 21.4142 19.4142C21.0391 19.7893 20.5304 20 20 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V6C2 5.46957 2.21071 4.96086 2.58579 4.58579C2.96086 4.21071 3.46957 4 4 4Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Pages edge detail */}
    <Path
      d="M5 4V20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Cross on cover - simple and clear */}
    {isActive ? (
      <>
        {/* Cross in white when active */}
        <Line x1="12" y1="8" x2="12" y2="16" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
        <Line x1="9" y1="11" x2="15" y2="11" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ) : (
      <>
        {/* Cross in same color when inactive */}
        <Line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <Line x1="9" y1="11" x2="15" y2="11" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

export const HeartIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Heart - fully filled when active */}
    <Path
      d="M20.84 4.61012C20.3292 4.09912 19.7228 3.69376 19.0554 3.4172C18.3879 3.14064 17.6725 2.99829 16.95 2.99829C16.2275 2.99829 15.5121 3.14064 14.8446 3.4172C14.1772 3.69376 13.5708 4.09912 13.06 4.61012L12 5.67012L10.94 4.61012C9.9083 3.57842 8.50903 2.99883 7.05 2.99883C5.59096 2.99883 4.19169 3.57842 3.16 4.61012C2.1283 5.64181 1.54871 7.04108 1.54871 8.50012C1.54871 9.95915 2.1283 11.3584 3.16 12.3901L4.22 13.4501L12 21.2301L19.78 13.4501L20.84 12.3901C21.351 11.8794 21.7563 11.2729 22.0329 10.6055C22.3095 9.93801 22.4518 9.2226 22.4518 8.50012C22.4518 7.77763 22.3095 7.06222 22.0329 6.39476C21.7563 5.7273 21.351 5.12087 20.84 4.61012Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CompassIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Outer circle - filled when active */}
    <Circle
      cx="12"
      cy="12"
      r="10"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Compass needle - always white/contrasting when filled */}
    <Path
      d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z"
      fill={isActive ? 'white' : 'none'}
      stroke={isActive ? 'white' : color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Calendar outline (top part - header) */}
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      ry="2"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bottom part of calendar - filled when active */}
    <Rect
      x="3"
      y="10"
      width="18"
      height="12"
      fill={isActive ? color : 'none'}
    />
    {/* Re-draw bottom outline to ensure clean edges */}
    <Path
      d="M3 10H21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Top hanging lines */}
    <Line
      x1="16"
      y1="2"
      x2="16"
      y2="6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Line
      x1="8"
      y1="2"
      x2="8"
      y2="6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Date dots (shown when active, in white) */}
    {isActive && (
      <>
        <Circle cx="8" cy="14" r="1" fill="white" />
        <Circle cx="12" cy="14" r="1" fill="white" />
        <Circle cx="16" cy="14" r="1" fill="white" />
        <Circle cx="8" cy="18" r="1" fill="white" />
        <Circle cx="12" cy="18" r="1" fill="white" />
        <Circle cx="16" cy="18" r="1" fill="white" />
      </>
    )}
  </Svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* User circle (head) - filled when active */}
    <Circle
      cx="12"
      cy="8"
      r="4"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* User body - filled when active */}
    <Path
      d="M20 21C20 19.4087 19.3679 17.8826 18.2426 16.7574C17.1174 15.6321 15.5913 15 14 15H10C8.4087 15 6.88258 15.6321 5.75736 16.7574C4.63214 17.8826 4 19.4087 4 21"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CommunityIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Multiple users icon for community */}
    {/* Left person (head) */}
    <Circle
      cx="9"
      cy="7"
      r="3"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Left person (body) */}
    <Path
      d="M2 21V18C2 16.3431 3.34315 15 5 15H13C14.6569 15 16 16.3431 16 18V21"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right person (head) - slightly behind */}
    <Circle
      cx="17"
      cy="7"
      r="3"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right person (body) - slightly behind */}
    <Path
      d="M16 15H19C20.6569 15 22 16.3431 22 18V21"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// =============================================================================
// NEW NAVIGATION ICONS
// =============================================================================

/**
 * Sunrise Icon - For "Today" tab
 * Sun rising over horizon with rays
 */
export const SunriseIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Horizon line */}
    <Path
      d="M3 17H21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Sun (half circle rising) */}
    <Path
      d="M12 17C15.3137 17 18 14.3137 18 11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11C6 14.3137 8.68629 17 12 17Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Sun rays */}
    <Path
      d="M12 2V4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.22 9.22L5.64 10.64"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.78 9.22L18.36 10.64"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Ground/horizon fill when active */}
    {isActive && (
      <Rect x="3" y="17" width="18" height="4" fill={color} />
    )}
    {/* Bottom line */}
    <Path
      d="M3 21H21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Message Circle Icon - For "Community" tab
 * Chat bubble with dots
 */
export const MessageCircleIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Chat bubble */}
    <Path
      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Typing dots when active */}
    {isActive && (
      <>
        <Circle cx="8.5" cy="11.5" r="1" fill="white" />
        <Circle cx="12.5" cy="11.5" r="1" fill="white" />
        <Circle cx="16.5" cy="11.5" r="1" fill="white" />
      </>
    )}
  </Svg>
);

/**
 * Heart Handshake Icon - For "Give" tab
 * Heart with hands symbolizing giving/generosity
 */
export const HeartHandshakeIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Heart shape */}
    <Path
      d="M19 14C20.49 12.54 22 10.79 22 8.5C22 7.04131 21.4205 5.64236 20.3891 4.61091C19.3576 3.57946 17.9587 3 16.5 3C14.74 3 13.5 3.5 12 5C10.5 3.5 9.26 3 7.5 3C6.04131 3 4.64236 3.57946 3.61091 4.61091C2.57946 5.64236 2 7.04131 2 8.5C2 10.8 3.5 12.55 5 14L12 21L19 14Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Hands/giving gesture */}
    <Path
      d="M12 5L9 8L12 11L15 8L12 5Z"
      fill={isActive ? 'white' : 'none'}
      stroke={isActive ? 'white' : color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Cross in heart when active */}
    {isActive && (
      <>
        <Line x1="12" y1="11" x2="12" y2="16" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
        <Line x1="9.5" y1="13" x2="14.5" y2="13" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

/**
 * Plus Icon - For GROW FAB button
 */
export const PlusIcon: React.FC<IconProps> = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 12H19"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Sprout/Grow Icon - For GROW FAB button (alternative)
 * A seedling/plant growing upward
 */
export const GrowIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Stem */}
    <Path
      d="M12 22V12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Left leaf */}
    <Path
      d="M12 12C12 12 8 10 5 7C5 7 5 12 12 12Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right leaf */}
    <Path
      d="M12 8C12 8 16 6 19 3C19 3 19 8 12 8Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
