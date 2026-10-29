import React, { useId } from 'react';

interface BrandIconProps {
  size?: number | string;
  className?: string;
}

export function BrandIcon({ size = 38, className = '' }: BrandIconProps) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role="img"
      aria-label="ITUZE Emblem"
      className={`ituze-brand-emblem-svg ${className}`.trim()}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`bgGrad-${uid}`} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E114A" />
          <stop offset="50%" stopColor="#11092E" />
          <stop offset="100%" stopColor="#070417" />
        </linearGradient>
        <radialGradient id={`ambientGlow-${uid}`} cx="64" cy="42" r="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F8BFF" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#6366F1" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#070417" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`rimGrad-${uid}`} x1="8" y1="8" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#818CF8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`bagGrad-${uid}`} x1="24" y1="34" x2="96" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="42%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id={`bagShine-${uid}`} x1="28" y1="38" x2="72" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`goldAccent-${uid}`} x1="54" y1="12" x2="74" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="120" height="120" rx="30" fill={`url(#bgGrad-${uid})`} />
      <rect x="4" y="4" width="120" height="120" rx="30" fill={`url(#ambientGlow-${uid})`} />
      <rect
        x="5.5"
        y="5.5"
        width="117"
        height="117"
        rx="28.5"
        fill="none"
        stroke={`url(#rimGrad-${uid})`}
        strokeWidth="2.6"
      />

      {/* Luxury Star Sparkle */}
      <path
        d="M98 18 L100.2 23.8 L106 26 L100.2 28.2 L98 34 L95.8 28.2 L90 26 L95.8 23.8 Z"
        fill={`url(#goldAccent-${uid})`}
      />

      <g transform="translate(4, 4)">
        <path
          d="M43 44V31a15 15 0 0 1 30 0v13"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M24 40H90L96 98H18Z"
          fill={`url(#bagGrad-${uid})`}
          stroke="#60A5FA"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M26 42H88L62 82H21Z" fill={`url(#bagShine-${uid})`} />

        <path
          d="M30 50H39L43 60"
          fill="none"
          stroke="#0D0726"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M43 60H102L93 83H52Z"
          fill="#0D0726"
          stroke="#0D0726"
          strokeWidth="9"
          strokeLinejoin="round"
        />
        <path
          d="M52 83L55 91H92"
          fill="none"
          stroke="#0D0726"
          strokeWidth="12.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="98.5" r="9.5" fill="#0D0726" />
        <circle cx="86" cy="98.5" r="9.5" fill="#0D0726" />

        <path
          d="M30 50H39L43 60"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="6.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M43 60H102L93 83H52Z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        <path d="M64 64H79L69 79H54Z" fill={`url(#bagGrad-${uid})`} />
        <path d="M80 64H91L81 79H70Z" fill="#38BDF8" opacity="0.88" />

        <path
          d="M52 83L55 91H92"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="98.5" r="5.8" fill="#FFFFFF" />
        <circle cx="86" cy="98.5" r="5.8" fill="#FFFFFF" />
        <circle cx="60" cy="98.5" r="2.5" fill="#2563EB" />
        <circle cx="86" cy="98.5" r="2.5" fill="#2563EB" />
      </g>
    </svg>
  );
}

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandLogo({ variant = 'light', size = 'md', className = '' }: BrandLogoProps) {
  const uid = useId().replace(/:/g, '');
  const isDarkSurface = variant === 'dark';

  const dimensions = {
    sm: { icon: 32, wordmarkW: 94, wordmarkH: 23, gap: 9 },
    md: { icon: 38, wordmarkW: 112, wordmarkH: 27, gap: 11 },
    lg: { icon: 44, wordmarkW: 128, wordmarkH: 31, gap: 12 },
  }[size];

  return (
    <span
      className={`ituze-brand-lockup ituze-brand-${variant} ituze-brand-${size} ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${dimensions.gap}px`,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <span className="ituze-brand-icon-shell">
        <BrandIcon size={dimensions.icon} />
      </span>

      {/* Sculpted Custom Geometric ITUZE Wordmark with Signature Electric Z Slash */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 172 44"
        width={dimensions.wordmarkW}
        height={dimensions.wordmarkH}
        role="img"
        aria-label="ITUZE"
        className="ituze-brand-wordmark-svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`wordPrimary-${uid}`} x1="0" y1="0" x2="172" y2="44" gradientUnits="userSpaceOnUse">
            {isDarkSurface ? (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#F1F5F9" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#1E114A" />
                <stop offset="50%" stopColor="#1E1B4B" />
                <stop offset="100%" stopColor="#0F172A" />
              </>
            )}
          </linearGradient>

          <linearGradient id={`wordAccentZ-${uid}`} x1="98" y1="4" x2="132" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>

        <g transform="translate(0, 2)">
          {/* Letter I with subtle diamond bevel cap */}
          <rect x="0" y="0" width="9.5" height="40" rx="2" fill={`url(#wordPrimary-${uid})`} />

          {/* Letter T */}
          <path
            fill={`url(#wordPrimary-${uid})`}
            d="M17 0H47a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 47 9H36.8v29.5A1.5 1.5 0 0 1 35.3 40h-6.6a1.5 1.5 0 0 1-1.5-1.5V9H17a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 17 0Z"
          />

          {/* Letter U */}
          <path
            fill={`url(#wordPrimary-${uid})`}
            d="M55 0h9.2v23a7.8 7.8 0 0 0 15.6 0V0H89v23c0 9.6-7.6 17.3-17 17.3S55 32.6 55 23V0Z"
          />

          {/* Letter Z — Signature Electric Diagonal Slash + Top/Bottom Bars */}
          <path
            fill={`url(#wordAccentZ-${uid})`}
            d="M117.2 8.2H129.4L111.2 31.8H99Z"
          />
          <rect x="97" y="0" width="32.5" height="8.8" rx="1.8" fill={`url(#wordPrimary-${uid})`} />
          <rect x="97" y="31.2" width="32.5" height="8.8" rx="1.8" fill={`url(#wordPrimary-${uid})`} />

          {/* Letter E */}
          <path
            fill={`url(#wordPrimary-${uid})`}
            d="M137.5 0H165.5a1.5 1.5 0 0 1 1.5 1.5v5.8a1.5 1.5 0 0 1-1.5 1.5H146.8V15.8H161.5a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5H146.8V31.2H165.5a1.5 1.5 0 0 1 1.5 1.5v5.8a1.5 1.5 0 0 1-1.5 1.5H137.5a1.5 1.5 0 0 1-1.5-1.5V1.5A1.5 1.5 0 0 1 137.5 0Z"
          />

          {/* Signature Luxury Accent Sparkle Dot at Top-Right of E */}
          <circle cx="170.5" cy="3.5" r="2.6" fill="#38BDF8" />
        </g>
      </svg>
    </span>
  );
}
