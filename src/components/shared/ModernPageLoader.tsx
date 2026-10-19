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
        <div className="modern-loader-logo-core">
          <Zap size={24} className="modern-loader-zap" />
        </div>
      </div>
    </div>
  );
}
