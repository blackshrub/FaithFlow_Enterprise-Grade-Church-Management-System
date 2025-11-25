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
    {/* Open book - two pages */}
    {/* Left page */}
    <Path
      d="M2 3H12V21L12 21C10.8954 21 10 20.1046 10 19V3H2Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right page */}
    <Path
      d="M22 3H12V21C13.1046 21 14 20.1046 14 19V3H22Z"
      fill={isActive ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Center binding/spine */}
    <Line
      x1="12"
      y1="3"
      x2="12"
      y2="21"
      stroke={color}
      strokeWidth={2}
    />
    {/* Page lines - only when active, in white */}
    {isActive && (
      <>
        {/* Left page lines */}
        <Line x1="4" y1="7" x2="10" y2="7" stroke="white" strokeWidth={1} />
        <Line x1="4" y1="10" x2="10" y2="10" stroke="white" strokeWidth={1} />
        <Line x1="4" y1="13" x2="10" y2="13" stroke="white" strokeWidth={1} />
        {/* Right page lines */}
        <Line x1="14" y1="7" x2="20" y2="7" stroke="white" strokeWidth={1} />
        <Line x1="14" y1="10" x2="20" y2="10" stroke="white" strokeWidth={1} />
        <Line x1="14" y1="13" x2="20" y2="13" stroke="white" strokeWidth={1} />
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
