import React, { useId } from 'react';

interface LiquidGlassStudioLogoProps {
  size?: number;
  className?: string;
}

/**
 * LiquidGlassStudioLogo - Dedicated logo for Liquid Glass Studio
 * Optical liquid droplet & glass crystal refraction
 * Pure vector with purple-pink gradient, strictly frameless (không khung).
 */
export const LiquidGlassStudioLogo: React.FC<LiquidGlassStudioLogoProps> = ({
  size = 20,
  className = '',
}) => {
  const rawId = useId();
  const gradId = `lgs-logo-grad-${rawId.replace(/[:]/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Outer liquid glass droplet contour */}
      <path
        d="M12 2.5C12 2.5 5.5 10.5 5.5 15.5C5.5 19.0899 8.41015 22 12 22C15.5899 22 18.5 19.0899 18.5 15.5C18.5 10.5 12 2.5 12 2.5Z"
        stroke={`url(#${gradId})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Internal optical lens reflection / refraction arc */}
      <path
        d="M9 13.5C9.2 16 10.8 17.8 13.5 18"
        stroke={`url(#${gradId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Specular glass gleam / sparkle */}
      <circle cx="14" cy="9.5" r="1.25" fill={`url(#${gradId})`} />
    </svg>
  );
};
