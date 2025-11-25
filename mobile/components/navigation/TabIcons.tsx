/**
 * Custom Tab Bar Icons with Selective Fill Control
 *
 * Each icon has granular control over which parts get filled when active:
 * - Home: Fill wall only, door remains outlined
 * - Bible: Fill book, keep center divider white
 * - Heart: Full fill
 * - Compass: Fill circle, needle stays white
 * - Calendar: Fill bottom part only
 */

import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  isActive?: boolean;
}

export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* House roof */}
    <Path
      d="M3 12L12 3L21 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* House walls - filled when active */}
    <Path
      d="M5 12V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V12"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Door - always outlined */}
    <Path
      d="M9 21V15C9 14.4696 9.21071 13.9609 9.58579 13.5858C9.96086 13.2107 10.4696 13 11 13H13C13.5304 13 14.0391 13.2107 14.4142 13.5858C14.7893 13.9609 15 14.4696 15 15V21"
      fill="white"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BibleIcon: React.FC<IconProps> = ({ size = 24, color = '#000', isActive = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Book outline - filled when active */}
    <Path
      d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Center divider line - always white/transparent when filled */}
    <Line
      x1="12"
      y1="2"
      x2="12"
      y2="22"
      stroke={isActive ? 'white' : color}
      strokeWidth={2}
      strokeLinecap="round"
    />
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
