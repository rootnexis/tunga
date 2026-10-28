import React from 'react';
import { Zap } from 'lucide-react';

interface Props {
  fullPage?: boolean;
  label?: string;
}

export function ModernPageLoader({ fullPage = true }: Props) {
  return (
    <div className={`modern-loader-container ${fullPage ? 'full-page' : ''}`} role="status" aria-label="Loading">
      {/* Top radiant progress line */}
      <div className="modern-loader-top-bar" />

      {/* Minimalist Logo and Outer Circle only — no box */}
      <div className="modern-loader-orb-wrap">
        <div className="modern-loader-orbit-ring" />
        <div className="modern-loader-orbit-ring-reverse" />
        <div className="modern-loader-logo-core" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
          <img
            src="/assets/aistudio/ituze-favicon-1_10b6b826.svg"
            alt="Ituze"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: 'inherit' }}
          />
        </div>
      </div>
    </div>
  );
}
